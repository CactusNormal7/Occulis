import { DurableObject } from "cloudflare:workers";
import {
  type Action,
  type ActionError,
  type GameState,
  type MatchMemory,
  type Piece,
  type PlayerId,
  type PlayerView,
  type Scenario,
  type ScenarioSnapshot,
  type TeamEntry,
  advanceMemory,
  createGame,
  deployTeams,
  replayMemory,
  frozenScenario,
  validateTeam,
  viewFor,
} from "@occulis/core";
import {
  PROTOCOL_VERSION,
  type ParsedClientMessage,
  type Locks,
  type PlayerCard,
  type ServerMessage,
  type WireView,
  encodeView,
  parseClientMessage,
} from "@occulis/protocol";
import { ratingChanges } from "./rating.js";
import { rulesetFor } from "./rulesets.js";
import { type Seats, denyOutOfTurn, seatFor } from "./seating.js";

/** Le tag d'un spectateur : distinct des tags de siège `A` / `B`, donc jamais un joueur. */
function watchTag(side: PlayerId): string {
  return `watch:${side}`;
}

/**
 * La vue d'un camp telle qu'un spectateur la reçoit : identique à celle du joueur —
 * il ne voit rien que son ami ne voie — moins les coups légaux, qui ne le concernent pas.
 */
function spectatorView(view: PlayerView): WireView {
  return encodeView({ ...view, legalActions: [] });
}

export interface MatchConfig {
  readonly matchId: string;
  readonly rulesetVersion: string;
  readonly scenario: string;
  /**
   * La carte figée à la création (`matches.map`). Absente des parties d'avant : elles
   * jouent la carte du registre sous le nom `scenario`.
   */
  readonly map?: ScenarioSnapshot;
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
/**
 * Un siège resté sans connexion aussi longtemps perd la partie par forfait. Assez long
 * pour qu'un rechargement de page ou une coupure brève reconnecte avant, assez court pour
 * qu'un onglet fermé ne laisse pas la partie « en cours » à jamais (implementation-notes 31).
 * Le temps de réflexion reste illimité : seule l'absence est bornée, pas le tour.
 */
export const ABSENCE_MS = 30_000;

/** Délai avant de retenter l'écriture d'une clôture que D1 a refusée (`closeMatch()`). */
const OUTCOME_RETRY_MS = 5_000;

/** Une fin acquise au log mais pas encore inscrite dans `matches` (`closeMatch()`). */
const UNRECORDED = "unrecorded-outcome";

function absenceKey(player: PlayerId): string {
  return `absent:${player}`;
}

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

  /**
   * Les coups passent un par un. Le DO est mono-threadé, mais ses *input gates* ne
   * couvrent que son propre stockage : pendant un `await` sur D1, un autre message peut
   * entrer, et deux coups se valideraient contre la même position.
   */
  private turns: Promise<unknown> = Promise.resolve();

  private exclusive<T>(task: () => Promise<T>): Promise<T> {
    const run = this.turns.then(task, task);
    this.turns = run.catch(() => undefined);
    return run;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/init") {
      const config = (await request.json()) as MatchConfig;
      await this.ctx.storage.put("config", config);
      if (frozenScenario(config.scenario, config.map).deployment !== undefined) {
        const deadline = Date.now() + DEPLOYMENT_MS;
        await this.ctx.storage.put("deadline", deadline);
        // Une alarme et non un minuteur : elle survit à l'hibernation du DO, qui est
        // justement ce qu'il fait pendant que les joueurs réfléchissent.
        await this.ctx.storage.setAlarm(deadline + DEPLOYMENT_GRACE_MS);
      }
      return new Response(null, { status: 204 });
    }

    const config = await this.config();

    // Chemin atteint seulement par le Worker, qui a vérifié que la session est bien celle
    // du joueur de ce camp : c'est ainsi qu'il retrouve sa partie après un rechargement.
    if (url.pathname === "/seat") {
      const side = url.searchParams.get("side");
      if (side !== "A" && side !== "B") return new Response("unknown side", { status: 400 });
      return Response.json({ seat: config.seats[side] });
    }

    // Chemin atteint seulement par le Worker, qui a vérifié l'amitié et le réglage du
    // joueur suivi : la route publique `/match/:id` ne transmet que son propre chemin.
    if (url.pathname === "/watch") {
      const side = url.searchParams.get("side");
      if (side !== "A" && side !== "B") return new Response("unknown side", { status: 400 });
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("expected websocket", { status: 426 });
      }
      const pair = new WebSocketPair();
      this.ctx.acceptWebSocket(pair[1], [watchTag(side)]);
      this.announceSpectators(side);
      return new Response(null, { status: 101, webSocket: pair[0] });
    }

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
    // Revenu à temps : le forfait qui courait depuis sa déconnexion tombe. L'adversaire,
    // s'il n'est pas là sans qu'aucun départ ait été noté — une partie d'avant le forfait —,
    // commence à compter maintenant : sinon le joueur revenu l'attendrait à jamais.
    await this.ctx.storage.delete(absenceKey(player));
    const other: PlayerId = player === "A" ? "B" : "A";
    if (
      !this.connected(other) &&
      (await this.ctx.storage.get<number>(absenceKey(other))) === undefined
    ) {
      await this.ctx.storage.put(absenceKey(other), Date.now());
    }
    await this.scheduleAlarm();
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    if (typeof raw !== "string") return;
    const message = parseClientMessage(raw);
    if (message === undefined) return;
    const watched = this.watchedBy(ws);
    if (watched !== undefined) {
      await this.greetSpectator(ws, watched, message);
      return;
    }
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
        board: [...(await this.scenario()).board().allTiles()],
        rulesetVersion: config.rulesetVersion,
      });
      this.send(ws, { kind: "spectators", count: this.ctx.getWebSockets(watchTag(player)).length });
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
   * Le gestionnaire doit exister — le runtime l'appelle sur tout socket accepté pour
   * l'hibernation, et lève une exception non rattrapée s'il est absent (constaté par les
   * tests dans workerd).
   *
   * Une déconnexion n'interrompt pas la partie tout de suite : le joueur a `ABSENCE_MS`
   * pour revenir — un rechargement de page y suffit — avant de perdre par forfait. Le
   * départ d'un spectateur, lui, se signale seulement au camp qu'il regardait.
   */
  async webSocketClose(ws: WebSocket): Promise<void> {
    await this.left(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.left(ws);
  }

  private async left(ws: WebSocket): Promise<void> {
    const watched = this.watchedBy(ws);
    if (watched !== undefined) {
      this.announceSpectators(watched, ws);
      return;
    }
    const player = this.playerOf(ws);
    if (player === undefined) return;
    // Un autre onglet resté ouvert sur le même siège suffit à ne pas le compter absent.
    if (this.connected(player, ws)) return;
    if ((await this.ctx.storage.get<number>(absenceKey(player))) !== undefined) return;
    await this.ctx.storage.put(absenceKey(player), Date.now());
    await this.scheduleAlarm();
  }

  /**
   * Un spectateur ne joue pas : tout ce qu'il envoie hors `hello` est refusé, et il ne
   * reçoit que la vue du camp qu'il suit.
   */
  private async greetSpectator(
    ws: WebSocket,
    side: PlayerId,
    message: ParsedClientMessage,
  ): Promise<void> {
    if (message.kind !== "hello") {
      this.send(ws, { kind: "rejected", error: { code: "unknown-seat" } });
      return;
    }
    if (message.protocol !== PROTOCOL_VERSION) {
      this.send(ws, { kind: "protocol-mismatch", expected: PROTOCOL_VERSION });
      ws.close(4001, "protocol-mismatch");
      return;
    }
    const config = await this.config();
    this.send(ws, {
      kind: "watching",
      side,
      scenario: config.scenario,
      board: [...(await this.scenario()).board().allTiles()],
      rulesetVersion: config.rulesetVersion,
    });
    // Pendant le déploiement, aucune position n'existe encore — et la zone de l'ami
    // trahirait ses choix : le spectateur attend la première vue, que `start` diffusera.
    if (await this.deploying()) return;
    const live = await this.load();
    this.send(ws, { kind: "view", view: spectatorView(viewFor(live.state, live.knowledge[side])) });
  }

  /** Dit au joueur combien d'amis le regardent ; `leaving` est le socket qui se ferme. */
  private announceSpectators(side: PlayerId, leaving?: WebSocket): void {
    const count = this.ctx
      .getWebSockets(watchTag(side))
      .filter((socket) => socket !== leaving).length;
    for (const socket of this.ctx.getWebSockets(side))
      this.send(socket, { kind: "spectators", count });
  }

  /**
   * Le camp a au moins un socket ouvert, `leaving` excepté. Un socket qui se ferme reste
   * listé par `getWebSockets` le temps de sa fermeture : seul l'état `OPEN` compte.
   */
  private connected(player: PlayerId, leaving?: WebSocket): boolean {
    return this.ctx
      .getWebSockets(player)
      .some((socket) => socket !== leaving && socket.readyState === WebSocket.OPEN);
  }

  private watchedBy(ws: WebSocket): PlayerId | undefined {
    const tag = this.ctx.getTags(ws)[0];
    if (tag === watchTag("A")) return "A";
    if (tag === watchTag("B")) return "B";
    return undefined;
  }

  /**
   * L'unique alarme du DO porte deux échéances : celle du déploiement — qui n'a rien
   * verrouillé reçoit l'équipe par défaut de la carte — et celle de l'absence d'un siège,
   * qui le fait perdre par forfait. Elle peut donc sonner pour l'une sans que l'autre soit
   * due, et se réarme sur la prochaine.
   */
  async alarm(): Promise<void> {
    const now = Date.now();
    if (await this.ctx.storage.get<boolean>(UNRECORDED)) {
      await this.recordOutcome((await this.load()).state);
      await this.ctx.storage.delete(UNRECORDED);
    }
    if (await this.deploying()) {
      const deadline = (await this.ctx.storage.get<number>("deadline")) ?? 0;
      const deployment = (await this.scenario()).deployment;
      if (deployment !== undefined && now >= deadline + DEPLOYMENT_GRACE_MS) {
        const teams = await this.teams();
        await this.start({
          A: teams.A ?? deployment.defaultTeams.A,
          B: teams.B ?? deployment.defaultTeams.B,
        });
      }
    }
    if (!(await this.deploying())) await this.forfeitAbsent(now);
    await this.scheduleAlarm();
  }

  /**
   * Le premier siège absent depuis `ABSENCE_MS` abandonne ; si les deux le sont, c'est
   * celui parti le premier. Une partie déjà finie n'a plus d'absence à suivre.
   */
  private forfeitAbsent(now: number): Promise<void> {
    return this.exclusive(() => this.forfeitIfDue(now));
  }

  private async forfeitIfDue(now: number): Promise<void> {
    const live = await this.load();
    const since = await this.absences();
    if (live.state.outcome === null) {
      const due = (["A", "B"] as const)
        .filter((seat) => since[seat] !== undefined && now >= (since[seat] ?? 0) + ABSENCE_MS)
        .filter((seat) => !this.connected(seat))
        .sort((x, y) => (since[x] ?? 0) - (since[y] ?? 0))[0];
      if (due === undefined) return;
      await this.commit(live, { kind: "resign", player: due });
    }
    await this.ctx.storage.delete([absenceKey("A"), absenceKey("B")]);
  }

  private async absences(): Promise<Record<PlayerId, number | undefined>> {
    const stored = await this.ctx.storage.get<number>([absenceKey("A"), absenceKey("B")]);
    return { A: stored.get(absenceKey("A")), B: stored.get(absenceKey("B")) };
  }

  /**
   * Réarme l'alarme sur la prochaine échéance. Pendant le déploiement, seule la sienne
   * compte : une absence ne peut se solder qu'une fois la partie ouverte, ce que fait
   * l'alarme du déploiement elle-même — sinon l'alarme d'une absence échue sonnerait en
   * boucle sans pouvoir rien conclure.
   */
  private async scheduleAlarm(): Promise<void> {
    let next: number | undefined;
    if (await this.deploying()) {
      const deadline = await this.ctx.storage.get<number>("deadline");
      if (deadline !== undefined) next = deadline + DEPLOYMENT_GRACE_MS;
    } else {
      const since = await this.absences();
      for (const at of [since.A, since.B]) {
        if (at !== undefined) next = Math.min(next ?? Infinity, at + ABSENCE_MS);
      }
    }
    if (await this.ctx.storage.get<boolean>(UNRECORDED))
      next = Math.min(next ?? Infinity, Date.now() + OUTCOME_RETRY_MS);
    if (next === undefined) await this.ctx.storage.deleteAlarm();
    else await this.ctx.storage.setAlarm(next);
  }

  /**
   * Le camp vient du tag posé à l'acceptation du socket, jamais du message : c'est
   * la seule donnée que l'expéditeur ne contrôle pas.
   */
  private playerOf(ws: WebSocket): PlayerId | undefined {
    const tag = this.ctx.getTags(ws)[0];
    return tag === "A" || tag === "B" ? tag : undefined;
  }

  private async deploy(
    entries: readonly TeamEntry[] | undefined,
    player: PlayerId,
    from: WebSocket,
  ): Promise<void> {
    if (!(await this.deploying()))
      return this.send(from, { kind: "rejected", error: { code: "wrong-phase" } });
    const teams = await this.teams();
    if (teams[player] !== undefined)
      return this.send(from, { kind: "rejected", error: { code: "already-locked" } });

    if (entries === undefined)
      return this.send(from, { kind: "rejected", error: { code: "malformed-team" } });

    const config = await this.config();
    const deployment = (await this.scenario()).deployment;
    if (deployment === undefined)
      return this.send(from, { kind: "rejected", error: { code: "wrong-phase" } });
    const valid = validateTeam(
      rulesetFor(config.rulesetVersion),
      deployment.zones[player],
      entries,
    );
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
   *
   * D1 d'abord : c'est le `setup` du DO qui clôt le déploiement (`deploying()`). Si D1
   * échoue, la partie reste en déploiement et l'alarme retentera ; dans l'ordre inverse,
   * le DO jouerait des pièces que les replays ne connaîtraient jamais. Retenter est sans
   * risque, `deployTeams()` rendant les mêmes pièces pour les mêmes équipes.
   */
  private async start(teams: Readonly<Record<PlayerId, readonly TeamEntry[]>>): Promise<void> {
    const config = await this.config();
    const deployment = (await this.scenario()).deployment;
    if (deployment === undefined) return;
    const pieces = deployTeams(rulesetFor(config.rulesetVersion), deployment, teams);
    if (!pieces.ok)
      throw new Error(
        `MatchDO: invalid team for ${pieces.error.player}: ${pieces.error.error.code}`,
      );

    await this.env.DB.prepare("UPDATE matches SET setup = ? WHERE id = ?")
      .bind(JSON.stringify(pieces.value), config.matchId)
      .run();
    await this.ctx.storage.put("setup", pieces.value);
    this.live = null;
    // Un siège qui ne s'est jamais connecté — ou plus depuis le déploiement — n'a laissé
    // aucune fermeture à compter : son absence part de l'ouverture de la partie.
    const now = Date.now();
    for (const seat of ["A", "B"] as const) {
      if (this.connected(seat)) continue;
      if ((await this.ctx.storage.get<number>(absenceKey(seat))) === undefined) {
        await this.ctx.storage.put(absenceKey(seat), now);
      }
    }
    await this.scheduleAlarm();
    await this.broadcastViews();
  }

  private play(action: Action, player: PlayerId, from: WebSocket): Promise<void> {
    return this.exclusive(() => this.playNow(action, player, from));
  }

  private async playNow(action: Action, player: PlayerId, from: WebSocket): Promise<void> {
    if (await this.deploying()) {
      this.send(from, { kind: "rejected", error: { code: "wrong-phase" } });
      return;
    }
    const live = await this.load();

    // L'abandon se joue hors tour, et c'est le siège qui dit qui abandonne — jamais le
    // message, qui pourrait sinon faire abandonner l'adversaire. Un joueur qui quitte la
    // partie abandonne ainsi même pendant le tour d'en face, et elle se clôt.
    const stamped: Action = action.kind === "resign" ? { kind: "resign", player } : action;
    const denial =
      stamped.kind === "resign" ? undefined : denyOutOfTurn(live.state.activePlayer, player);
    if (denial !== undefined) {
      this.send(from, { kind: "rejected", error: denial });
      return;
    }

    const error = await this.commit(live, stamped);
    if (error !== undefined) this.send(from, { kind: "rejected", error });
  }

  /**
   * Applique une action déjà autorisée : log, clôture éventuelle, diffusion. Toujours
   * appelée sous `exclusive()`.
   *
   * Le cache n'avance qu'une fois le coup écrit en D1 : si l'écriture échoue, l'erreur
   * remonte et l'état reste celui que le log décrit — sans quoi le DO jouerait sur une
   * position que le rejeu, après hibernation, ne retrouverait pas (« Corrupted log »).
   */
  private async commit(live: MatchMemory, action: Action): Promise<ActionError | undefined> {
    const advanced = advanceMemory(live, action);
    if (!advanced.ok) return advanced.error;

    await this.appendToLog(action, live.state.history.length);
    this.live = advanced.value;

    if (advanced.value.state.outcome !== null) await this.closeMatch(advanced.value.state);
    await this.broadcastViews();
    return undefined;
  }

  /**
   * La fin est déjà au log, donc acquise ; reste à l'inscrire dans `matches`. Si D1 la
   * refuse, l'alarme la retente : une partie finie qui resterait « en cours » en base ne
   * serait jamais rattrapée, `forfeitAbsent()` ignorant les parties déjà closes.
   */
  private async closeMatch(state: GameState): Promise<void> {
    await this.ctx.storage.put(UNRECORDED, true);
    try {
      await this.recordOutcome(state);
      await this.ctx.storage.delete(UNRECORDED);
    } catch {
      await this.scheduleAlarm();
    }
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
   *
   * Rejouable : chaque écriture est conditionnée à une partie encore ouverte, et le lot
   * s'exécute dans l'ordre, la clôture en dernier. Une seconde tentative, après une
   * première qui aurait abouti sans que sa réponse arrive, ne change donc rien.
   */
  private async recordOutcome(state: GameState): Promise<void> {
    const config = await this.config();
    const db = this.env.DB;
    const finish = (changes: { a: number; b: number } | null) =>
      db
        .prepare(
          `UPDATE matches SET finished_at = ?, outcome = ?, rating_change_a = ?, rating_change_b = ?
           WHERE id = ? AND finished_at IS NULL`,
        )
        .bind(
          Date.now(),
          JSON.stringify(state.outcome),
          changes?.a ?? null,
          changes?.b ?? null,
          config.matchId,
        );

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
    const bump = db.prepare(
      `UPDATE players SET elo = elo + ? WHERE id = ?
         AND EXISTS (SELECT 1 FROM matches WHERE id = ? AND finished_at IS NULL)`,
    );
    await db.batch([
      bump.bind(changes.a, A, config.matchId),
      bump.bind(changes.b, B, config.matchId),
      finish(changes),
    ]);
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
      const seen = viewFor(live.state, live.knowledge[player]);
      const view = encodeView(seen);
      for (const socket of this.ctx.getWebSockets(player)) {
        this.send(socket, { kind: "view", view });
      }
      const watched = spectatorView(seen);
      for (const socket of this.ctx.getWebSockets(watchTag(player))) {
        this.send(socket, { kind: "view", view: watched });
      }
    }
  }

  private send(ws: WebSocket, message: ServerMessage): void {
    try {
      ws.send(JSON.stringify(message));
    } catch {
      // Un socket en train de se fermer : rien à lui dire.
    }
  }

  private async config(): Promise<MatchConfig> {
    const config = await this.ctx.storage.get<MatchConfig>("config");
    if (config === undefined) throw new Error("MatchDO: match not initialised");
    return config;
  }

  private async scenario(): Promise<Scenario> {
    const config = await this.config();
    return frozenScenario(config.scenario, config.map);
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
    const scenario = await this.scenario();
    const setup = await this.ctx.storage.get<Piece[]>("setup");
    const start = createGame(scenario.board(), rulesetFor(config.rulesetVersion), [
      ...(setup ?? scenario.pieces),
    ]);

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
  return (
    config.cards?.[player] ?? {
      handle: config.players?.[player] ?? player,
      elo: 1200,
      played: 0,
      won: 0,
      feats: [],
    }
  );
}
