import { DurableObject } from "cloudflare:workers";
import {
  type Action,
  type GameState,
  type PlayerId,
  type PlayerKnowledge,
  applyAction,
  createGame,
  emptyKnowledge,
  observe,
  viewFor,
} from "@occulis/core";
import { PROTOCOL_VERSION, type ClientMessage, type ServerMessage, encodeView } from "./protocol.js";
import { rulesetFor } from "./rulesets.js";
import { scenarioFor } from "./scenarios.js";

export interface MatchConfig {
  readonly matchId: string;
  readonly rulesetVersion: string;
  readonly scenario: string;
}

interface Live {
  state: GameState;
  knowledge: Record<PlayerId, PlayerKnowledge>;
}

/**
 * Une partie. Le DO est mono-threadé, donc les tours sont sérialisés sans verrou, et
 * chaque joueur ne reçoit que son propre `viewFor()` : le fog est structurel, pas
 * appliqué à l'affichage (docs/architecture.md section 2).
 */
export class MatchDO extends DurableObject<Env> {
  private live: Live | null = null;

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/init") {
      const config = (await request.json()) as MatchConfig;
      await this.ctx.storage.put("config", config);
      return new Response(null, { status: 204 });
    }

    const player = url.searchParams.get("player");
    if (player !== "A" && player !== "B") {
      return new Response("player must be A or B", { status: 400 });
    }
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("expected websocket", { status: 426 });
    }

    const pair = new WebSocketPair();
    // acceptWebSocket (et non server.accept) est ce qui autorise l'hibernation : sans
    // lui le DO reste en mémoire tant que le socket est ouvert, pour un coût ~20 000
    // fois supérieur et aucune différence fonctionnelle (docs/costs.md).
    this.ctx.acceptWebSocket(pair[1], [player]);
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    if (typeof raw !== "string") return;
    const message = JSON.parse(raw) as ClientMessage;

    if (message.kind === "hello") {
      if (message.protocol !== PROTOCOL_VERSION) {
        this.send(ws, { kind: "protocol-mismatch", expected: PROTOCOL_VERSION });
        ws.close(4001, "protocol-mismatch");
        return;
      }
      await this.broadcastViews();
      return;
    }

    if (message.kind === "action") {
      await this.play(message.action, ws);
    }
  }

  private async play(action: Action, from: WebSocket): Promise<void> {
    const live = await this.load();
    const result = applyAction(live.state, action);
    if (!result.ok) {
      this.send(from, { kind: "rejected", error: result.error });
      return;
    }

    live.state = result.value;
    live.knowledge = {
      A: observe(live.knowledge.A, live.state),
      B: observe(live.knowledge.B, live.state),
    };

    await this.appendToLog(action);
    await this.broadcastViews();
  }

  /** Le log en D1 est la source de vérité ; l'état du DO n'en est qu'un cache. */
  private async appendToLog(action: Action): Promise<void> {
    const config = await this.config();
    await this.env.DB.prepare(
      "INSERT INTO match_actions (match_id, seq, action) VALUES (?, ?, ?)",
    )
      .bind(config.matchId, (await this.load()).state.turn, JSON.stringify(action))
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
  private async load(): Promise<Live> {
    if (this.live !== null) return this.live;

    const config = await this.config();
    const { board, pieces } = scenarioFor(config.scenario);
    let state = createGame(board, rulesetFor(config.rulesetVersion), [...pieces]);
    let knowledge: Record<PlayerId, PlayerKnowledge> = {
      A: observe(emptyKnowledge("A"), state),
      B: observe(emptyKnowledge("B"), state),
    };

    const logged = await this.env.DB.prepare(
      "SELECT action FROM match_actions WHERE match_id = ? ORDER BY seq ASC",
    )
      .bind(config.matchId)
      .all<{ action: string }>();

    for (const row of logged.results) {
      const replayed = applyAction(state, JSON.parse(row.action) as Action);
      if (!replayed.ok) throw new Error(`Log corrompu pour ${config.matchId}: ${replayed.error.code}`);
      state = replayed.value;
      knowledge = { A: observe(knowledge.A, state), B: observe(knowledge.B, state) };
    }

    this.live = { state, knowledge };
    return this.live;
  }
}
