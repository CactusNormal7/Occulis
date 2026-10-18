import { DurableObject } from "cloudflare:workers";
import {
  PROTOCOL_VERSION,
  type Challenge,
  type SocialServerMessage,
  type SocialSurface,
  parseSocialClientMessage,
} from "@occulis/protocol";
import { startMatch } from "./match-setup.js";
import { friendIds, isFriend } from "./social/queries.js";

/**
 * Le canal social d'un joueur : **une instance par joueur** (`idFromName(playerId)`).
 *
 * Il tient les sockets de toutes ses pages ouvertes — le jeu comme le profil — et leur
 * pousse ce qui le concerne : demandes d'amis, messages, présence de ses amis, défis.
 * Les routes REST écrivent en D1 puis le préviennent (`POST https://social/push`) ; il
 * ne détient lui-même que deux choses : sa présence, et les défis.
 *
 * - **La présence** se lit au nombre de sockets : le premier ouvert rend le joueur
 *   présent, la fermeture du dernier l'en retire. `players.online` n'en est qu'un cache,
 *   pour que la liste d'amis se lise en une requête plutôt qu'en un appel par ami.
 * - **Un défi** vit dans l'instance de son auteur : elle est mono-threadée, donc une
 *   invitation ne peut être acceptée qu'une fois, comme un salon dans la file. Il meurt
 *   avec le dernier socket de jeu de son auteur — personne ne serait là pour s'asseoir.
 *
 * L'hibernation est acquise par `acceptWebSocket` ; tout ce qui doit lui survivre est
 * dans les tags du socket ou dans le stockage.
 */
export class SocialDO extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const self = url.searchParams.get("player") ?? "";
    if (self.length === 0) return new Response("player required", { status: 400 });
    await this.ctx.storage.put("player", self);

    if (url.pathname === "/push") {
      await this.receive((await request.json()) as SocialServerMessage);
      return new Response(null, { status: 204 });
    }
    if (url.pathname === "/challenge") return this.challenge((await request.json()) as Challenge);
    if (url.pathname === "/challenge/cancel") {
      const { to } = (await request.json()) as { to: string };
      return Response.json({ cancelled: await this.cancel(to) });
    }
    if (url.pathname === "/challenge/accept") {
      const { to } = (await request.json()) as { to: string };
      return this.accept(self, to);
    }

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("expected websocket", { status: 426 });
    }
    const surface: SocialSurface = url.searchParams.get("surface") === "game" ? "game" : "profile";
    const arriving = this.ctx.getWebSockets().length === 0;
    const pair = new WebSocketPair();
    // Le tag dit où la page est ouverte : seul le jeu sait s'asseoir à une partie.
    this.ctx.acceptWebSocket(pair[1], [surface]);
    if (arriving) await this.announce(self, true);
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    if (typeof raw !== "string") return;
    const message = parseSocialClientMessage(raw);
    if (message === undefined) return;
    if (message.protocol !== PROTOCOL_VERSION) {
      this.send(ws, { kind: "protocol-mismatch", expected: PROTOCOL_VERSION });
      ws.close(4001, "protocol-mismatch");
      return;
    }
    // Une page qui arrive apprend les défis qu'on lui a lancés pendant son absence.
    for (const challenge of (await this.incoming()).values())
      this.send(ws, { kind: "challenge", challenge });
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    await this.leave(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.leave(ws);
  }

  private async leave(ws: WebSocket): Promise<void> {
    const self = await this.ctx.storage.get<string>("player");
    if (self === undefined) return;
    const remaining = this.ctx.getWebSockets().filter((socket) => socket !== ws);
    if (!remaining.some((socket) => this.ctx.getTags(socket).includes("game"))) {
      for (const to of (await this.outgoing()).keys()) await this.cancel(to);
    }
    if (remaining.length === 0) await this.announce(self, false);
  }

  /** Écrit le cache de présence, puis le dit à chaque ami. */
  private async announce(self: string, online: boolean): Promise<void> {
    await this.env.DB.prepare("UPDATE players SET online = ? WHERE id = ?")
      .bind(online ? 1 : 0, self)
      .run();
    const friends = await friendIds(this.env.DB, self);
    await Promise.all(
      friends.map((friend) =>
        pushTo(this.env, friend, { kind: "presence", playerId: self, online }),
      ),
    );
  }

  /** Une poussée venue d'une route ou d'une autre instance, relayée à ses pages. */
  private async receive(message: SocialServerMessage): Promise<void> {
    if (message.kind === "challenge") {
      const incoming = await this.incoming();
      incoming.set(message.challenge.from.id, message.challenge);
      await this.ctx.storage.put("incoming", incoming);
    }
    if (message.kind === "challenge-cancelled") {
      const incoming = await this.incoming();
      if (incoming.delete(message.from)) await this.ctx.storage.put("incoming", incoming);
    }
    const sockets =
      message.kind === "matched" ? this.ctx.getWebSockets("game") : this.ctx.getWebSockets();
    for (const socket of sockets) this.send(socket, message);
  }

  private async challenge(challenge: Challenge): Promise<Response> {
    if (this.ctx.getWebSockets("game").length === 0) {
      return Response.json({ code: "GAME_CLOSED" }, { status: 409 });
    }
    const outgoing = await this.outgoing();
    outgoing.set(challenge.to.id, challenge);
    await this.ctx.storage.put("outgoing", outgoing);
    await pushTo(this.env, challenge.to.id, { kind: "challenge", challenge });
    return Response.json(challenge);
  }

  private async cancel(to: string): Promise<boolean> {
    const outgoing = await this.outgoing();
    const challenge = outgoing.get(to);
    if (challenge === undefined) return false;
    outgoing.delete(to);
    await this.ctx.storage.put("outgoing", outgoing);
    const cancelled: SocialServerMessage = {
      kind: "challenge-cancelled",
      from: challenge.from.id,
      to,
    };
    await pushTo(this.env, to, cancelled);
    for (const socket of this.ctx.getWebSockets()) this.send(socket, cancelled);
    return true;
  }

  /**
   * L'acceptation, sérialisée ici : le défi est retiré **avant** que la partie soit
   * créée, donc une seconde acceptation ne trouve plus rien. L'amitié est revérifiée —
   * un blocage a pu tomber entre l'invitation et la réponse.
   */
  private async accept(self: string, to: string): Promise<Response> {
    const outgoing = await this.outgoing();
    const challenge = outgoing.get(to);
    if (challenge === undefined) return Response.json({ code: "NO_CHALLENGE" }, { status: 404 });
    outgoing.delete(to);
    await this.ctx.storage.put("outgoing", outgoing);
    await pushTo(this.env, to, { kind: "challenge-cancelled", from: self, to });

    if (this.ctx.getWebSockets("game").length === 0) {
      return Response.json({ code: "GAME_CLOSED" }, { status: 409 });
    }
    if (!(await isFriend(this.env.DB, self, to))) {
      return Response.json({ code: "NOT_FRIENDS" }, { status: 403 });
    }

    // L'auteur du défi joue le camp A, comme l'hôte d'un salon privé.
    const match = await startMatch(this.env, self, to);
    await this.receive({
      kind: "matched",
      matchId: match.matchId,
      player: "A",
      seat: match.seats.A,
    });
    await pushTo(this.env, to, {
      kind: "matched",
      matchId: match.matchId,
      player: "B",
      seat: match.seats.B,
    });
    return Response.json({ matchId: match.matchId });
  }

  private async outgoing(): Promise<Map<string, Challenge>> {
    return (await this.ctx.storage.get<Map<string, Challenge>>("outgoing")) ?? new Map();
  }

  private async incoming(): Promise<Map<string, Challenge>> {
    return (await this.ctx.storage.get<Map<string, Challenge>>("incoming")) ?? new Map();
  }

  private send(ws: WebSocket, message: SocialServerMessage): void {
    try {
      ws.send(JSON.stringify(message));
    } catch {
      // Un socket en train de se fermer : sa fermeture fera le ménage.
    }
  }
}

function socialOf(env: Env, playerId: string): DurableObjectStub {
  return env.SOCIAL.get(env.SOCIAL.idFromName(playerId));
}

/** Appelle l'instance sociale d'un joueur, en lui rappelant qui elle sert. */
export function callSocial(
  env: Env,
  playerId: string,
  path: string,
  body?: unknown,
): Promise<Response> {
  const url = new URL(`https://social${path}`);
  url.searchParams.set("player", playerId);
  return socialOf(env, playerId).fetch(
    new Request(url, { method: "POST", body: body === undefined ? null : JSON.stringify(body) }),
  );
}

/**
 * Prévient un joueur. Une poussée perdue ne doit jamais faire échouer l'écriture qui l'a
 * causée : la donnée est en D1, la page la relira.
 */
export async function pushTo(
  env: Env,
  playerId: string,
  message: SocialServerMessage,
): Promise<void> {
  try {
    await callSocial(env, playerId, "/push", message);
  } catch (cause) {
    console.error(`[social] poussée perdue vers ${playerId}`, cause);
  }
}

/** Le WebSocket du canal social, ouvert par le Worker pour le joueur de la session. */
export function openSocial(
  env: Env,
  request: Request,
  playerId: string,
  surface: SocialSurface,
): Promise<Response> {
  const url = new URL("https://social/connect");
  url.searchParams.set("player", playerId);
  url.searchParams.set("surface", surface);
  return socialOf(env, playerId).fetch(new Request(url, request));
}
