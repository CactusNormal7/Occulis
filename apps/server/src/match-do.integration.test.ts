import { SELF, env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type { ClientMessage, ServerMessage } from "@occulis/protocol";
import { PROTOCOL_VERSION } from "@occulis/protocol";
import type { StartedMatch } from "./match-setup.js";

/**
 * Tests d'intégration dans **workerd**, le runtime réel.
 *
 * Ils couvrent ce qu'aucun test unitaire ne peut voir : que les Durable Objects
 * reçoivent réellement leurs messages, que D1 accepte les écritures — la contrainte de
 * clé étrangère de `matches` a déjà cassé la création de partie sans qu'aucun test
 * unitaire ne bronche — et que le fog tient sur le fil.
 *
 * **C'est aussi le test d'hibernation que CLAUDE.md réclame** : `webSocketMessage()` et
 * `webSocketClose()` ne sont appelés que sur un socket accepté par
 * `ctx.acceptWebSocket()`. Passer à `server.accept()` — la variante qui empêche
 * l'hibernation et multiplie le coût par ~20 000 (docs/costs.md) — ferait taire ces
 * gestionnaires, et tout ce fichier échouerait.
 */
async function createMatch(): Promise<StartedMatch> {
  const response = await SELF.fetch("https://occulis.test/api/matches", {
    method: "POST",
    body: JSON.stringify({ playerA: `anne-${crypto.randomUUID()}`, playerB: `boris-${crypto.randomUUID()}` }),
  });
  expect(response.status).toBe(200);
  return (await response.json()) as StartedMatch;
}

/** Un joueur connecté, dont on peut attendre un message d'un type donné. */
async function seat(matchId: string, token: string) {
  const response = await SELF.fetch(`https://occulis.test/match/${matchId}?seat=${token}`, {
    headers: { Upgrade: "websocket" },
  });
  expect(response.status).toBe(101);

  const socket = response.webSocket;
  if (socket === null) throw new Error("pas de WebSocket dans la réponse");
  socket.accept();

  let received: ServerMessage[] = [];
  const waiters: (() => void)[] = [];
  socket.addEventListener("message", (event) => {
    received.push(JSON.parse(String(event.data)) as ServerMessage);
    for (const wake of waiters.splice(0)) wake();
  });

  const awaitKind = <K extends ServerMessage["kind"]>(kind: K) =>
    new Promise<Extract<ServerMessage, { kind: K }>>((resolve, reject) => {
      const deadline = setTimeout(() => reject(new Error(`aucun message "${kind}"`)), 3000);
      const look = (): void => {
        const index = received.findIndex((message) => message.kind === kind);
        if (index < 0) return void waiters.push(look);
        clearTimeout(deadline);
        resolve(received.splice(index, 1)[0] as Extract<ServerMessage, { kind: K }>);
      };
      look();
    });

  const send = (message: ClientMessage): void => socket.send(JSON.stringify(message));
  send({ kind: "hello", protocol: PROTOCOL_VERSION });

  return { socket, send, awaitKind, drain: () => (received = []) };
}

describe("MatchDO dans workerd", () => {
  it("refuse une connexion sans jeton de siège valide", async () => {
    const match = await createMatch();

    for (const token of ["", "A", "jeton-bidon"]) {
      const response = await SELF.fetch(`https://occulis.test/match/${match.matchId}?seat=${token}`, {
        headers: { Upgrade: "websocket" },
      });
      expect(response.status).toBe(403);
    }
  });

  it("délivre à chaque joueur son camp et sa seule vue", async () => {
    const match = await createMatch();
    const a = await seat(match.matchId, match.seats.A);
    const b = await seat(match.matchId, match.seats.B);

    expect((await a.awaitKind("welcome")).player).toBe("A");
    expect((await b.awaitKind("welcome")).player).toBe("B");

    const view = (await a.awaitKind("view")).view;
    expect(view.player).toBe("A");
    expect(view.ownPieces.map((piece) => piece.id).sort()).toEqual(["a-cmd", "a-scout"]);
    // La carte de démonstration coupe la vue en deux : rien de B ne doit passer.
    expect(view.visibleEnemies).toEqual([]);
    expect(JSON.stringify(view)).not.toContain("b-cmd");

    a.socket.close();
    b.socket.close();
  });

  it("refuse une action venue du joueur qui n'est pas au trait", async () => {
    const match = await createMatch();
    const a = await seat(match.matchId, match.seats.A);
    const b = await seat(match.matchId, match.seats.B);
    await a.awaitKind("view");
    await b.awaitKind("view");

    // `core` vérifie que la pièce est au trait, pas que l'expéditeur en est le
    // propriétaire : sans le contrôle du serveur, B jouerait les pièces de A.
    b.send({ kind: "action", action: { kind: "move", pieceId: "a-scout", to: { x: 2, y: 6 } } });
    expect((await b.awaitKind("rejected")).error).toEqual({ code: "not-your-turn", activePlayer: "A" });

    a.socket.close();
    b.socket.close();
  });

  it("applique un coup, l'écrit au log et le diffuse aux deux joueurs", async () => {
    const match = await createMatch();
    const a = await seat(match.matchId, match.seats.A);
    const b = await seat(match.matchId, match.seats.B);
    await a.awaitKind("view");
    await b.awaitKind("view");
    a.drain();
    b.drain();

    a.send({ kind: "action", action: { kind: "move", pieceId: "a-scout", to: { x: 2, y: 6 } } });
    const forA = (await a.awaitKind("view")).view;
    const forB = (await b.awaitKind("view")).view;

    expect(forA.turn).toBe(1);
    expect(forA.activePlayer).toBe("B");
    expect(forB.turn).toBe(1);

    const logged = await env.DB.prepare("SELECT seq, action FROM match_actions WHERE match_id = ?")
      .bind(match.matchId)
      .all<{ seq: number; action: string }>();
    expect(logged.results).toEqual([
      { seq: 0, action: '{"kind":"move","pieceId":"a-scout","to":{"x":2,"y":6}}' },
    ]);

    a.socket.close();
    b.socket.close();
  });

  it("clôt la partie en base à l'abandon", async () => {
    const match = await createMatch();
    const a = await seat(match.matchId, match.seats.A);
    await a.awaitKind("view");
    a.drain();

    a.send({ kind: "action", action: { kind: "resign" } });
    const view = (await a.awaitKind("view")).view;
    expect(view.outcome).toEqual({ kind: "victory", winner: "B", reason: "resignation" });

    const row = await env.DB.prepare("SELECT finished_at, outcome FROM matches WHERE id = ?")
      .bind(match.matchId)
      .first<{ finished_at: number | null; outcome: string | null }>();
    expect(row?.finished_at).not.toBeNull();
    expect(row?.outcome).toBe('{"kind":"victory","winner":"B","reason":"resignation"}');

    a.socket.close();
  });

  it("ferme la connexion d'un client au protocole incompatible", async () => {
    const match = await createMatch();
    const response = await SELF.fetch(`https://occulis.test/match/${match.matchId}?seat=${match.seats.A}`, {
      headers: { Upgrade: "websocket" },
    });
    const socket = response.webSocket;
    if (socket === null) throw new Error("pas de WebSocket dans la réponse");
    socket.accept();

    const refused = new Promise<ServerMessage>((resolve) => {
      socket.addEventListener("message", (event) => resolve(JSON.parse(String(event.data)) as ServerMessage));
    });
    socket.send(JSON.stringify({ kind: "hello", protocol: PROTOCOL_VERSION + 1 }));

    expect(await refused).toEqual({ kind: "protocol-mismatch", expected: PROTOCOL_VERSION });
  });
});
