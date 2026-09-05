import { DurableObject } from "cloudflare:workers";
import {
  type Action,
  type GameState,
  type MatchMemory,
  type PlayerId,
  advanceMemory,
  createGame,
  replayMemory,
  viewFor,
} from "@occulis/core";
import { PROTOCOL_VERSION, type ClientMessage, type ServerMessage, encodeView } from "@occulis/protocol";
import { rulesetFor } from "./rulesets.js";
import { scenarioFor } from "./scenarios.js";
import { type Seats, denyOutOfTurn, seatFor } from "./seating.js";

export interface MatchConfig {
  readonly matchId: string;
  readonly rulesetVersion: string;
  readonly scenario: string;
  readonly seats: Seats;
}

/**
 * Une partie. Le DO est mono-threadé, donc les tours sont sérialisés sans verrou, et
 * chaque joueur ne reçoit que son propre `viewFor()` : le fog est structurel, pas
 * appliqué à l'affichage (docs/architecture.md section 2).
 */
export class MatchDO extends DurableObject<Env> {
  private live: MatchMemory | null = null;

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/init") {
      const config = (await request.json()) as MatchConfig;
      await this.ctx.storage.put("config", config);
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
      await this.broadcastViews();
      return;
    }

    if (message.kind === "action") {
      await this.play(message.action, player, ws);
    }
  }

  /**
   * Le camp vient du tag posé à l'acceptation du socket, jamais du message : c'est
   * la seule donnée que l'expéditeur ne contrôle pas.
   */
  private playerOf(ws: WebSocket): PlayerId | undefined {
    const tag = this.ctx.getTags(ws)[0];
    return tag === "A" || tag === "B" ? tag : undefined;
  }

  private async play(action: Action, player: PlayerId, from: WebSocket): Promise<void> {
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

  private async recordOutcome(state: GameState): Promise<void> {
    const config = await this.config();
    await this.env.DB.prepare("UPDATE matches SET finished_at = ?, outcome = ? WHERE id = ?")
      .bind(Date.now(), JSON.stringify(state.outcome), config.matchId)
      .run();
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
    if (config === undefined) throw new Error("MatchDO: partie non initialisée");
    return config;
  }

  /**
   * Reconstruit l'état en rejouant le log. Possible uniquement parce que `core` est
   * strictement déterministe : aucun `Math.random`, aucun `Date.now` (voir CLAUDE.md).
   */
  private async load(): Promise<MatchMemory> {
    if (this.live !== null) return this.live;

    const config = await this.config();
    const { board, pieces } = scenarioFor(config.scenario);
    const start = createGame(board, rulesetFor(config.rulesetVersion), [...pieces]);

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
        `Log corrompu pour ${config.matchId} au coup ${rebuilt.error.seq}: ${rebuilt.error.code}`,
      );
    }

    this.live = rebuilt.value;
    return this.live;
  }
}
