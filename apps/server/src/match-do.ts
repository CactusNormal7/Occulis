import { DurableObject } from "cloudflare:workers";
import {
  type Action,
  type GameState,
  type MatchMemory,
  type Piece,
  type PlayerId,
  type Scenario,
  type TeamEntry,
  advanceMemory,
  createGame,
  deployTeams,
  parseTeam,
  replayMemory,
  scenarioFor,
  validateTeam,
  viewFor,
} from "@occulis/core";
import {
  PROTOCOL_VERSION,
  type ClientMessage,
  type Locks,
  type PlayerCard,
  type ServerMessage,
  encodeView,
} from "@occulis/protocol";
import { ratingChanges } from "./rating.js";
import { rulesetFor } from "./rulesets.js";
import { type Seats, denyOutOfTurn, seatFor } from "./seating.js";

export interface MatchConfig {
  readonly matchId: string;
  readonly rulesetVersion: string;
  readonly scenario: string;
  readonly seats: Seats;
  /**
   * Les trois champs suivants manquent aux parties créées avant le déploiement : elles
   * sont alors non classées, et n'ont pas de phase de déploiement à présenter.
   */
  readonly rated?: boolean;
  /** Les profils de jeu des deux camps, pour l'Elo. */
  readonly players?: Readonly<Record<PlayerId, string>>;
  /** Ce que chacun montre à l'autre à l'annonce de la partie (`cards.ts`). */
  readonly cards?: Readonly<Record<PlayerId, PlayerCard>>;
}

/**
 * Le temps laissé pour composer et poser son équipe. Le jeu lui-même reste sans limite
 * de temps (docs/design.md section 2) ; le déploiement non, sans quoi un joueur absent
 * tiendrait l'autre indéfiniment devant un écran de préparation.
 */
export const DEPLOYMENT_MS = 90_000;
/**
 * L'alarme sonne un peu après l'échéance annoncée : le client envoie son brouillon juste
 * avant, et ce message doit avoir le temps d'arriver.
 */
const DEPLOYMENT_GRACE_MS = 2_000;

type LockedTeams = Partial<Record<PlayerId, readonly TeamEntry[]>>;

/**
 * Une partie. Le DO est mono-threadé, donc les tours sont sérialisés sans verrou, et
 * chaque joueur ne reçoit que son propre `viewFor()` : le fog est structurel, pas
 * appliqué à l'affichage (docs/architecture.md section 2).
 *
 * Sur une carte à déploiement, la partie commence par **poser les équipes** : chaque
 * joueur envoie la sienne, qui se verrouille, et la partie démarre quand les deux le
 * sont — ou à l'échéance, l'équipe par défaut de la carte prenant la place de qui n'a
 * rien envoyé. Aucune pièce d'en face ne transite pendant cette phase : un camp ne voit
 * de l'autre que s'il est verrouillé.
 */
export class MatchDO extends DurableObject<Env> {
  private live: MatchMemory | null = null;

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/init") {
      const config = (await request.json()) as MatchConfig;
      await this.ctx.storage.put("config", config);
      if (scenarioFor(config.scenario).deployment !== undefined) {
        const deadline = Date.now() + DEPLOYMENT_MS;
        await this.ctx.storage.put("deadline", deadline);
        // Une alarme et non un minuteur : elle survit à l'hibernation du DO, qui est
        // justement ce qu'il fait pendant que les joueurs réfléchissent.
        await this.ctx.storage.setAlarm(deadline + DEPLOYMENT_GRACE_MS);
      }
      return new Response(null, { status: 204 });
    }

    const config = await this.config();
    const player = seatFor(config.seats, url.searchParams.get("seat"));
    if (player === undefined) return new Response("unknown seat", { status: 403 });
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("expected websocket", { status: 426 });
    }

    const pair = new WebSocketPair();
    // acceptWebSocket (et non server.accept) est ce qui autorise l'hibernation : sans
    // lui le DO reste en mémoire tant que le socket est ouvert, pour un coût ~20 000
    // fois supérieur et aucune différence fonctionnelle (docs/costs.md). Le camp est
    // porté par un tag, seule information qui survit à l'hibernation du socket.
    this.ctx.acceptWebSocket(pair[1], [player]);
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    if (typeof raw !== "string") return;
    const message = JSON.parse(raw) as ClientMessage;
    const player = this.playerOf(ws);
    if (player === undefined) return;

    if (message.kind === "hello") {
      if (message.protocol !== PROTOCOL_VERSION) {
        this.send(ws, { kind: "protocol-mismatch", expected: PROTOCOL_VERSION });
        ws.close(4001, "protocol-mismatch");
        return;
      }
      const config = await this.config();
      this.send(ws, {
        kind: "welcome",
        player,
        scenario: config.scenario,
        rulesetVersion: config.rulesetVersion,
      });
      if (await this.deploying()) await this.sendDeployment(ws, player);
      else await this.broadcastViews();
      return;
    }

    if (message.kind === "deploy") {
      await this.deploy(message.team, player, ws);
      return;
    }

    if (message.kind === "action") {
      await this.play(message.action, player, ws);
    }
  }

  /**
   * Rien à nettoyer : l'état de la partie ne dépend d'aucune connexion ouverte, et le
   * tag du camp disparaît avec le socket. Le gestionnaire doit exister malgré tout —
   * le runtime l'appelle sur tout socket accepté pour l'hibernation, et lève une
   * exception non rattrapée s'il est absent (constaté par les tests dans workerd).
   *
   * Une déconnexion n'interrompt pas la partie : le temps de réflexion est illimité
   * (docs/design.md section 2), et le joueur retrouve sa position en se reconnectant.
   * Pendant le déploiement non plus : l'échéance posera l'équipe par défaut.
   */
  async webSocketClose(): Promise<void> {}

  /** L'échéance du déploiement : qui n'a rien verrouillé reçoit l'équipe par défaut de la carte. */
  async alarm(): Promise<void> {
    if (!(await this.deploying())) return;
    const deployment = (await this.scenario()).deployment;
    if (deployment === undefined) return;
    const teams = await this.teams();
    await this.start({ A: teams.A ?? deployment.defaultTeams.A, B: teams.B ?? deployment.defaultTeams.B });
  }

  /**
   * Le camp vient du tag posé à l'acceptation du socket, jamais du message : c'est
   * la seule donnée que l'expéditeur ne contrôle pas.
   */
  private playerOf(ws: WebSocket): PlayerId | undefined {
    const tag = this.ctx.getTags(ws)[0];
    return tag === "A" || tag === "B" ? tag : undefined;
  }

  private async deploy(team: unknown, player: PlayerId, from: WebSocket): Promise<void> {
    if (!(await this.deploying())) return this.send(from, { kind: "rejected", error: { code: "wrong-phase" } });
    const teams = await this.teams();
    if (teams[player] !== undefined) return this.send(from, { kind: "rejected", error: { code: "already-locked" } });

    const entries = parseTeam(team);
    if (entries === undefined) return this.send(from, { kind: "rejected", error: { code: "malformed-team" } });

    const config = await this.config();
    const deployment = (await this.scenario()).deployment;
    if (deployment === undefined) return this.send(from, { kind: "rejected", error: { code: "wrong-phase" } });
    const valid = validateTeam(rulesetFor(config.rulesetVersion), deployment.zones[player], entries);
    if (!valid.ok) return this.send(from, { kind: "rejected", error: valid.error });

    const locked: LockedTeams = { ...teams, [player]: entries };
    await this.ctx.storage.put("teams", locked);
    if (locked.A !== undefined && locked.B !== undefined) {
      await this.start({ A: locked.A, B: locked.B });
      return;
    }
    for (const seat of ["A", "B"] as const) {
      for (const socket of this.ctx.getWebSockets(seat)) {
        this.send(socket, { kind: "deployment-update", locks: locksFor(locked, seat) });
      }
    }
  }

  /**
   * Pose les deux équipes et ouvre la partie. Les pièces de départ sont écrites en D1
   * (`matches.setup`) autant que dans le DO : c'est avec elles que le log se rejoue —
   * pour reconstruire l'état ici comme pour le replay du back-office et du profil.
   */
  private async start(teams: Readonly<Record<PlayerId, readonly TeamEntry[]>>): Promise<void> {
    const config = await this.config();
    const deployment = (await this.scenario()).deployment;
    if (deployment === undefined) return;
    const pieces = deployTeams(rulesetFor(config.rulesetVersion), deployment, teams);
    if (!pieces.ok) throw new Error(`MatchDO: invalid team for ${pieces.error.player}: ${pieces.error.error.code}`);

    await this.ctx.storage.put("setup", pieces.value);
    await this.ctx.storage.deleteAlarm();
    await this.env.DB.prepare("UPDATE matches SET setup = ? WHERE id = ?")
      .bind(JSON.stringify(pieces.value), config.matchId)
      .run();
    this.live = null;
    await this.broadcastViews();
  }

  private async play(action: Action, player: PlayerId, from: WebSocket): Promise<void> {
    if (await this.deploying()) {
      this.send(from, { kind: "rejected", error: { code: "wrong-phase" } });
      return;
    }
    const live = await this.load();

    const denial = denyOutOfTurn(live.state.activePlayer, player);
    if (denial !== undefined) {
      this.send(from, { kind: "rejected", error: denial });
      return;
    }

    const advanced = advanceMemory(live, action);
    if (!advanced.ok) {
      this.send(from, { kind: "rejected", error: advanced.error });
      return;
    }

    const seq = live.state.history.length;
    this.live = advanced.value;

    await this.appendToLog(action, seq);
    if (advanced.value.state.outcome !== null) await this.recordOutcome(advanced.value.state);
    await this.broadcastViews();
  }

  /**
   * Le log en D1 est la source de vérité ; l'état du DO n'en est qu'un cache.
   *
   * `seq` est l'index du coup dans l'historique **avant** application, ce qui le rend
   * indépendant de `turn` : deux notions qui coïncident aujourd'hui mais qu'une règle
   * à résolution différée (docs/design.md section 3.2) séparerait.
   */
  private async appendToLog(action: Action, seq: number): Promise<void> {
    const config = await this.config();
    await this.env.DB.prepare("INSERT INTO match_actions (match_id, seq, action) VALUES (?, ?, ?)")
      .bind(config.matchId, seq, JSON.stringify(action))
      .run();
  }

  /**
   * La clôture, et pour une partie classée la variation d'Elo des deux joueurs (`rating.ts`),
   * écrites d'un même lot : un Elo qui bougerait sans que la partie soit close, ou
   * l'inverse, ne se rattraperait jamais. Les Elo sont lus juste avant, au moment de la
   * fin, et non à la création : ce sont eux qui ont pu bouger entre-temps.
   */
  private async recordOutcome(state: GameState): Promise<void> {
    const config = await this.config();
    const db = this.env.DB;
    const finish = (changes: { a: number; b: number } | null) =>
      db
        .prepare("UPDATE matches SET finished_at = ?, outcome = ?, rating_change_a = ?, rating_change_b = ? WHERE id = ?")
        .bind(Date.now(), JSON.stringify(state.outcome), changes?.a ?? null, changes?.b ?? null, config.matchId);

    if (config.rated !== true || config.players === undefined || state.outcome === null) {
      await finish(null).run();
      return;
    }
    const { A, B } = config.players;
    const rows = await db
      .prepare("SELECT id, elo FROM players WHERE id IN (?, ?)")
      .bind(A, B)
      .all<{ id: string; elo: number }>();
    const elo = (id: string) => rows.results.find((row) => row.id === id)?.elo ?? 1200;
    const changes = ratingChanges(elo(A), elo(B), state.outcome.winner === "A" ? 1 : 0);
    const bump = db.prepare("UPDATE players SET elo = elo + ? WHERE id = ?");
    await db.batch([finish(changes), bump.bind(changes.a, A), bump.bind(changes.b, B)]);
  }

  private async sendDeployment(ws: WebSocket, player: PlayerId): Promise<void> {
    const config = await this.config();
    const deployment = (await this.scenario()).deployment;
    if (deployment === undefined) return;
    const other: PlayerId = player === "A" ? "B" : "A";
    const deadline = (await this.ctx.storage.get<number>("deadline")) ?? Date.now();
    this.send(ws, {
      kind: "deployment",
      zone: deployment.zones[player],
      opponentZone: deployment.zones[other],
      defaultTeam: deployment.defaultTeams[player],
      remainingMs: Math.max(0, deadline - Date.now()),
      locks: locksFor(await this.teams(), player),
      self: cardOf(config, player),
      opponent: cardOf(config, other),
      rated: config.rated === true,
    });
  }

  private async broadcastViews(): Promise<void> {
    const live = await this.load();
    for (const player of ["A", "B"] as const) {
      const view = encodeView(viewFor(live.state, live.knowledge[player]));
      for (const socket of this.ctx.getWebSockets(player)) {
        this.send(socket, { kind: "view", view });
      }
    }
  }

  private send(ws: WebSocket, message: ServerMessage): void {
    ws.send(JSON.stringify(message));
  }

  private async config(): Promise<MatchConfig> {
    const config = await this.ctx.storage.get<MatchConfig>("config");
    if (config === undefined) throw new Error("MatchDO: match not initialised");
    return config;
  }

  private async scenario(): Promise<Scenario> {
    return scenarioFor((await this.config()).scenario);
  }

  private async teams(): Promise<LockedTeams> {
    return (await this.ctx.storage.get<LockedTeams>("teams")) ?? {};
  }

  /** En déploiement : une carte qui en prévoit un, et des pièces pas encore posées. */
  private async deploying(): Promise<boolean> {
    if ((await this.scenario()).deployment === undefined) return false;
    return (await this.ctx.storage.get<Piece[]>("setup")) === undefined;
  }

  /**
   * Reconstruit l'état en rejouant le log. Possible uniquement parce que `core` est
   * strictement déterministe : aucun `Math.random`, aucun `Date.now` (voir CLAUDE.md).
   * Le point de départ est la position déployée, ou celle de la carte si elle n'en a pas.
   */
  private async load(): Promise<MatchMemory> {
    if (this.live !== null) return this.live;

    const config = await this.config();
    const scenario = scenarioFor(config.scenario);
    const setup = await this.ctx.storage.get<Piece[]>("setup");
    const start = createGame(scenario.board(), rulesetFor(config.rulesetVersion), [...(setup ?? scenario.pieces)]);

    const logged = await this.env.DB.prepare(
      "SELECT action FROM match_actions WHERE match_id = ? ORDER BY seq ASC",
    )
      .bind(config.matchId)
      .all<{ action: string }>();

    const rebuilt = replayMemory(
      start,
      logged.results.map((row) => JSON.parse(row.action) as Action),
    );
    if (!rebuilt.ok) {
      throw new Error(
        `Corrupted log for ${config.matchId} at move ${rebuilt.error.seq}: ${rebuilt.error.code}`,
      );
    }

    this.live = rebuilt.value;
    return this.live;
  }
}

function locksFor(teams: LockedTeams, player: PlayerId): Locks {
  const other: PlayerId = player === "A" ? "B" : "A";
  return { self: teams[player] !== undefined, opponent: teams[other] !== undefined };
}

/** La carte d'un camp ; une partie d'avant les cartes n'a que les jetons, d'où ce repli. */
function cardOf(config: MatchConfig, player: PlayerId): PlayerCard {
  return config.cards?.[player] ?? { handle: config.players?.[player] ?? player, elo: 1200, played: 0, won: 0, feats: [] };
}
