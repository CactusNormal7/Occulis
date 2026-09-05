import { DurableObject } from "cloudflare:workers";
import {
  PROTOCOL_VERSION,
  type QueueClientMessage,
  type QueueServerMessage,
} from "@occulis/protocol";
import { startMatch } from "./match-setup.js";
import { type Waiting, dequeue, enqueue, takePairing } from "./pairing.js";

/**
 * File d'attente globale : **une seule instance** pour tout le service.
 *
 * Son mono-threading élimine le double appariement par construction — deux joueurs
 * ne peuvent pas être servis en même temps, donc aucun ne peut être apparié deux
 * fois (docs/architecture.md section 2). Ne pas y ajouter de verrou.
 */
export const QUEUE_SINGLETON = "global";

export class QueueDO extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    const playerId = new URL(request.url).searchParams.get("player");
    if (playerId === null || playerId.length === 0) {
      return new Response("player required", { status: 400 });
    }
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("expected websocket", { status: 426 });
    }

    const pair = new WebSocketPair();
    // Le joueur et la connexion sont portés par des tags : ce sont les seules
    // données attachées au socket qui survivent à l'hibernation du DO.
    this.ctx.acceptWebSocket(pair[1], [playerId, crypto.randomUUID()]);
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    if (typeof raw !== "string") return;
    const message = JSON.parse(raw) as QueueClientMessage;
    if (message.kind !== "hello") return;

    if (message.protocol !== PROTOCOL_VERSION) {
      this.send(ws, { kind: "protocol-mismatch", expected: PROTOCOL_VERSION });
      ws.close(4001, "protocol-mismatch");
      return;
    }

    const entry = this.waitingOf(ws);
    if (entry === undefined) return;

    await this.ctx.storage.put("queue", enqueue(await this.queue(), entry));
    this.send(ws, { kind: "waiting" });
    await this.tryPair();
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const entry = this.waitingOf(ws);
    if (entry === undefined) return;
    await this.ctx.storage.put("queue", dequeue(await this.queue(), entry.connectionId));
  }

  /**
   * Les attentes dont le socket a disparu sont purgées avant tout appariement :
   * `webSocketClose` peut n'avoir jamais été appelé (fermeture brutale, hibernation
   * interrompue), et apparier un joueur absent perdrait la partie créée pour lui.
   */
  private async tryPair(): Promise<void> {
    const live = (await this.queue()).filter(
      (waiting) => this.socketOf(waiting.connectionId) !== undefined,
    );
    const { pairing, rest } = takePairing(live);
    if (pairing === undefined) {
      await this.ctx.storage.put("queue", live);
      return;
    }

    await this.ctx.storage.put("queue", rest);
    const match = await startMatch(this.env, pairing.a.playerId, pairing.b.playerId);
    const sockets = {
      A: this.socketOf(pairing.a.connectionId),
      B: this.socketOf(pairing.b.connectionId),
    };

    for (const player of ["A", "B"] as const) {
      const socket = sockets[player];
      if (socket === undefined) continue;
      this.send(socket, {
        kind: "matched",
        matchId: match.matchId,
        player,
        seat: match.seats[player],
      });
    }
  }

  private async queue(): Promise<readonly Waiting[]> {
    return (await this.ctx.storage.get<readonly Waiting[]>("queue")) ?? [];
  }

  private waitingOf(ws: WebSocket): Waiting | undefined {
    const [playerId, connectionId] = this.ctx.getTags(ws);
    if (playerId === undefined || connectionId === undefined) return undefined;
    return { playerId, connectionId };
  }

  private socketOf(connectionId: string): WebSocket | undefined {
    return this.ctx.getWebSockets(connectionId)[0];
  }

  private send(ws: WebSocket, message: QueueServerMessage): void {
    ws.send(JSON.stringify(message));
  }
}
