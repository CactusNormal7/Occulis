import { DurableObject } from "cloudflare:workers";
import {
  PROTOCOL_VERSION,
  type QueueClientMessage,
  type QueueIntent,
  type QueueServerMessage,
} from "@occulis/protocol";
import { startMatch } from "./match-setup.js";
import { type Waiting, dequeue, enqueue, takePairing } from "./pairing.js";
import { type Room, closeRoom, freeCode, normalizeCode, openRoom, takeRoom } from "./rooms.js";

/**
 * File d'attente globale : **une seule instance** pour tout le service.
 *
 * Son mono-threading élimine le double appariement par construction — deux joueurs
 * ne peuvent pas être servis en même temps, donc aucun ne peut être apparié deux
 * fois (docs/architecture.md section 2). Ne pas y ajouter de verrou.
 *
 * Elle porte aussi les **salons privés**, et pour la même raison : un salon consommé
 * par deux arrivants simultanés apparierait deux fois son hôte. Le mono-threading
 * l'écarte ici exactement comme il écarte le double appariement — les séparer en deux
 * objets rouvrirait la course entre « rejoindre un salon » et « être apparié ».
 */
export const QUEUE_SINGLETON = "global";

/**
 * Tirages successifs pour trouver un code libre. Cinq caractères sur 25 font
 * ~9,7 millions de combinaisons : cette boucle ne sert que pour l'invraisemblable.
 */
const CODE_ATTEMPTS = 8;

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

    // Une intention remplace la précédente : un même socket ne peut pas attendre à
    // la fois dans la file et dans un salon, sous peine d'être apparié deux fois.
    await this.forget(entry.connectionId);

    // Un client d'une autre version n'arrive pas jusqu'ici : la négociation l'a déjà
    // refusé. L'intention absente est donc une anomalie, traitée comme un appariement.
    const intent = message.intent as QueueIntent | undefined;
    if (intent?.kind === "host") return this.host(ws, entry);
    if (intent?.kind === "join") return this.join(ws, entry, normalizeCode(intent.code));
    return this.queueUp(ws, entry);
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const entry = this.waitingOf(ws);
    if (entry === undefined) return;
    await this.forget(entry.connectionId);
  }

  /** Appariement automatique : premier arrivé, premier servi. */
  private async queueUp(ws: WebSocket, entry: Waiting): Promise<void> {
    await this.ctx.storage.put("queue", enqueue(await this.queue(), entry));
    this.send(ws, { kind: "waiting" });
    await this.tryPair();
  }

  /**
   * Ouverture d'un salon privé. Le code est tiré ici et non par le client : lui seul
   * voit tous les salons, donc lui seul peut en garantir l'unicité.
   */
  private async host(ws: WebSocket, entry: Waiting): Promise<void> {
    // Le salon de l'hôte survit à la purge, précisément parce qu'il peut être en
    // train de se reconnecter : son ancien socket est mort, son code doit vivre.
    const rooms = (await this.rooms()).filter(
      (room) =>
        room.host.playerId === entry.playerId ||
        this.socketOf(room.host.connectionId) !== undefined,
    );
    const code = freeCode(rooms, draws());
    if (code === undefined) {
      // Invraisemblable, mais un salon sans code serait pire qu'un refus : l'hôte
      // attendrait un adversaire que personne ne peut rejoindre.
      this.send(ws, { kind: "room-fault", fault: { code: "unknown" } });
      return;
    }

    const opened = openRoom(rooms, entry, code);
    await this.ctx.storage.put("rooms", opened.rooms);
    this.send(ws, { kind: "hosting", code: opened.room.code });
  }

  /** Entrée dans un salon privé : l'hôte tient le camp A, l'arrivant le camp B. */
  private async join(ws: WebSocket, entry: Waiting, code: string): Promise<void> {
    const rooms = await this.liveRooms();
    const found = rooms.find((room) => room.code === code);

    if (found === undefined) {
      await this.ctx.storage.put("rooms", rooms);
      this.send(ws, { kind: "room-fault", fault: { code: "unknown" } });
      return;
    }
    if (found.host.playerId === entry.playerId) {
      // Le retrait n'a pas lieu : refuser son propre code ne doit pas fermer le salon
      // que l'hôte est justement en train de faire rejoindre.
      await this.ctx.storage.put("rooms", rooms);
      this.send(ws, { kind: "room-fault", fault: { code: "own" } });
      return;
    }

    const taken = takeRoom(rooms, code);
    await this.ctx.storage.put("rooms", taken.rooms);
    await this.seat(found.host, entry);
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
    await this.seat(pairing.a, pairing.b);
  }

  /** Crée la partie et annonce son siège à chacun des deux joueurs. */
  private async seat(a: Waiting, b: Waiting): Promise<void> {
    const match = await startMatch(this.env, a.playerId, b.playerId);
    const sockets = { A: this.socketOf(a.connectionId), B: this.socketOf(b.connectionId) };

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

  /** Retire cette connexion de partout : la file comme les salons. */
  private async forget(connectionId: string): Promise<void> {
    await this.ctx.storage.put("queue", dequeue(await this.queue(), connectionId));
    await this.ctx.storage.put("rooms", closeRoom(await this.rooms(), connectionId));
  }

  private async queue(): Promise<readonly Waiting[]> {
    return (await this.ctx.storage.get<readonly Waiting[]>("queue")) ?? [];
  }

  private async rooms(): Promise<readonly Room[]> {
    return (await this.ctx.storage.get<readonly Room[]>("rooms")) ?? [];
  }

  /**
   * Les salons dont l'hôte n'est plus connecté n'existent plus : les garder ferait
   * entrer un joueur dans une partie où personne ne l'attend, et occuperait un code.
   */
  private async liveRooms(): Promise<readonly Room[]> {
    return (await this.rooms()).filter(
      (room) => this.socketOf(room.host.connectionId) !== undefined,
    );
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

/** Les tirages proposés à `freeCode`, l'aléa restant hors de la logique pure. */
function draws(): readonly Uint8Array[] {
  return Array.from({ length: CODE_ATTEMPTS }, () => crypto.getRandomValues(new Uint8Array(8)));
}
