import { SELF, env, runDurableObjectAlarm } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type { ClientMessage, ServerMessage } from "@occulis/protocol";
import { PROTOCOL_VERSION } from "@occulis/protocol";
import { type StartedMatch, startMatch } from "./match-setup.js";
import { DEPLOYMENT_MS } from "./match-do.js";

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

/** Les deux joueurs assis, chacun ayant posé l'équipe par défaut de la carte. */
async function deployed(match: StartedMatch) {
  const a = await seat(match.matchId, match.seats.A);
  const b = await seat(match.matchId, match.seats.B);
  a.send({ kind: "deploy", team: (await a.awaitKind("deployment")).defaultTeam });
  b.send({ kind: "deploy", team: (await b.awaitKind("deployment")).defaultTeam });
  return { a, b };
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

  it("ouvre la partie par le déploiement : zones, équipe par défaut, cartes des joueurs", async () => {
    const match = await createMatch();
    const a = await seat(match.matchId, match.seats.A);

    expect((await a.awaitKind("welcome")).player).toBe("A");
    const deployment = await a.awaitKind("deployment");
    expect(deployment.zone).toHaveLength(16);
    expect(deployment.opponentZone).toHaveLength(16);
    expect(deployment.defaultTeam).toHaveLength(8);
    expect(deployment.locks).toEqual({ self: false, opponent: false });
    expect(deployment.remainingMs).toBeGreaterThan(0);
    expect(deployment.remainingMs).toBeLessThanOrEqual(DEPLOYMENT_MS);
    expect(deployment.self.elo).toBe(1200);
    expect(deployment.opponent.handle).toContain("boris-");
    expect(deployment.rated).toBe(false);

    a.socket.close();
  });

  it("refuse un coup avant la fin du déploiement, et une équipe invalide", async () => {
    const match = await createMatch();
    const a = await seat(match.matchId, match.seats.A);
    const { defaultTeam } = await a.awaitKind("deployment");

    a.send({ kind: "action", action: { kind: "resign" } });
    expect((await a.awaitKind("rejected")).error).toEqual({ code: "wrong-phase" });

    a.send({ kind: "deploy", team: defaultTeam.slice(1) });
    expect((await a.awaitKind("rejected")).error).toMatchObject({ code: "wrong-count", role: "commander" });

    a.send({ kind: "deploy", team: "n'importe quoi" as never });
    expect((await a.awaitKind("rejected")).error).toEqual({ code: "malformed-team" });

    a.socket.close();
  });

  it("verrouille une équipe, l'annonce aux deux camps, et n'en accepte pas une seconde", async () => {
    const match = await createMatch();
    const a = await seat(match.matchId, match.seats.A);
    const b = await seat(match.matchId, match.seats.B);
    const { defaultTeam } = await a.awaitKind("deployment");
    await b.awaitKind("deployment");

    a.send({ kind: "deploy", team: defaultTeam });
    expect((await a.awaitKind("deployment-update")).locks).toEqual({ self: true, opponent: false });
    expect((await b.awaitKind("deployment-update")).locks).toEqual({ self: false, opponent: true });

    a.send({ kind: "deploy", team: defaultTeam });
    expect((await a.awaitKind("rejected")).error).toEqual({ code: "already-locked" });

    a.socket.close();
    b.socket.close();
  });

  it("démarre quand les deux équipes sont posées, sans rien laisser passer d'en face", async () => {
    const match = await createMatch();
    const { a, b } = await deployed(match);

    const view = (await a.awaitKind("view")).view;
    expect(view.player).toBe("A");
    expect(view.ownPieces.map((piece) => piece.id).sort()).toEqual(["a-0", "a-1", "a-2", "a-3", "a-4", "a-5", "a-6", "a-7"]);
    // Les zones de la carte n'ont pas de vue mutuelle : rien de B ne doit passer.
    expect(view.visibleEnemies).toEqual([]);
    expect(JSON.stringify(view)).not.toContain('"b-');
    await b.awaitKind("view");

    const row = await env.DB.prepare("SELECT setup FROM matches WHERE id = ?").bind(match.matchId).first<{ setup: string | null }>();
    expect(JSON.parse(row?.setup ?? "[]")).toHaveLength(16);

    a.socket.close();
    b.socket.close();
  });

  it("pose l'équipe par défaut de qui n'a rien envoyé à l'échéance", async () => {
    const match = await createMatch();
    const a = await seat(match.matchId, match.seats.A);
    const { defaultTeam } = await a.awaitKind("deployment");
    // Une équipe différente du défaut, pour vérifier qu'elle est bien celle retenue.
    const mine = defaultTeam.map((entry, index) => (index === 0 ? { ...entry, coord: { x: 0, y: 8 } } : entry));
    a.send({ kind: "deploy", team: mine });
    await a.awaitKind("deployment-update");

    expect(await runDurableObjectAlarm(env.MATCH.get(env.MATCH.idFromName(match.matchId)))).toBe(true);
    const view = (await a.awaitKind("view")).view;
    expect(view.ownPieces.find((piece) => piece.id === "a-0")?.coord).toEqual({ x: 0, y: 8 });

    const row = await env.DB.prepare("SELECT setup FROM matches WHERE id = ?").bind(match.matchId).first<{ setup: string }>();
    const setup = JSON.parse(row?.setup ?? "[]") as { owner: string }[];
    expect(setup.filter((piece) => piece.owner === "B")).toHaveLength(8);

    a.socket.close();
  });

  it("refuse une action venue du joueur qui n'est pas au trait", async () => {
    const { a, b } = await deployed(await createMatch());
    await a.awaitKind("view");
    await b.awaitKind("view");

    // `core` vérifie que la pièce est au trait, pas que l'expéditeur en est le
    // propriétaire : sans le contrôle du serveur, B jouerait les pièces de A.
    b.send({ kind: "action", action: { kind: "move", pieceId: "a-4", to: { x: 1, y: 5 } } });
    expect((await b.awaitKind("rejected")).error).toEqual({ code: "not-your-turn", activePlayer: "A" });

    a.socket.close();
    b.socket.close();
  });

  it("applique un coup, l'écrit au log et le diffuse aux deux joueurs", async () => {
    const match = await createMatch();
    const { a, b } = await deployed(match);
    await a.awaitKind("view");
    await b.awaitKind("view");
    a.drain();
    b.drain();

    a.send({ kind: "action", action: { kind: "move", pieceId: "a-4", to: { x: 1, y: 5 } } });
    const forA = (await a.awaitKind("view")).view;
    const forB = (await b.awaitKind("view")).view;

    expect(forA.turn).toBe(1);
    expect(forA.activePlayer).toBe("B");
    expect(forB.turn).toBe(1);

    const logged = await env.DB.prepare("SELECT seq, action FROM match_actions WHERE match_id = ?")
      .bind(match.matchId)
      .all<{ seq: number; action: string }>();
    expect(logged.results).toEqual([{ seq: 0, action: '{"kind":"move","pieceId":"a-4","to":{"x":1,"y":5}}' }]);

    a.socket.close();
    b.socket.close();
  });

  it("laisse rejouer après un coup refusé, et la vue porte les coups légaux", async () => {
    // Le bug qui bloquait les parties : un refus ne rediffuse aucune vue, donc un
    // client qui aurait appliqué son coup en anticipation resterait persuadé que ce
    // n'est plus son tour. Côté serveur, un refus ne consomme rien du tout.
    const { a, b } = await deployed(await createMatch());
    const view = (await a.awaitKind("view")).view;
    expect(view.legalActions.length).toBeGreaterThan(0);
    a.drain();

    a.send({ kind: "action", action: { kind: "move", pieceId: "a-4", to: { x: 9, y: 9 } } });
    expect((await a.awaitKind("rejected")).error).toEqual({ code: "unreachable", to: { x: 9, y: 9 } });

    a.send({ kind: "action", action: { kind: "move", pieceId: "a-4", to: { x: 1, y: 5 } } });
    const after = (await a.awaitKind("view")).view;
    expect(after.turn).toBe(1);
    // Le trait est passé : plus aucun coup légal pour A tant que B n'a pas joué.
    expect(after.activePlayer).toBe("B");
    expect(after.legalActions).toEqual([]);

    a.socket.close();
    b.socket.close();
  });

  it("clôt la partie en base à l'abandon, sans toucher à l'Elo d'une partie privée", async () => {
    const match = await createMatch();
    const { a, b } = await deployed(match);
    await a.awaitKind("view");
    a.drain();

    a.send({ kind: "action", action: { kind: "resign" } });
    const view = (await a.awaitKind("view")).view;
    expect(view.outcome).toEqual({ kind: "victory", winner: "B", reason: "resignation" });

    const row = await env.DB.prepare("SELECT finished_at, outcome, rating_change_a FROM matches WHERE id = ?")
      .bind(match.matchId)
      .first<{ finished_at: number | null; outcome: string | null; rating_change_a: number | null }>();
    expect(row?.finished_at).not.toBeNull();
    expect(row?.outcome).toBe('{"kind":"victory","winner":"B","reason":"resignation"}');
    expect(row?.rating_change_a).toBeNull();

    a.socket.close();
    b.socket.close();
  });

  it("fait varier l'Elo des deux joueurs à la fin d'une partie classée", async () => {
    const [anne, boris] = [`anne-${crypto.randomUUID()}`, `boris-${crypto.randomUUID()}`];
    const match = await startMatch(env, anne, boris, { rated: true });
    const { a, b } = await deployed(match);
    await a.awaitKind("view");
    a.drain();

    a.send({ kind: "action", action: { kind: "resign" } });
    await a.awaitKind("view");

    const elo = async (id: string) => (await env.DB.prepare("SELECT elo FROM players WHERE id = ?").bind(id).first<{ elo: number }>())?.elo;
    expect(await elo(anne)).toBe(1184);
    expect(await elo(boris)).toBe(1216);
    const row = await env.DB.prepare("SELECT rated, rating_change_a, rating_change_b FROM matches WHERE id = ?")
      .bind(match.matchId)
      .first();
    expect(row).toEqual({ rated: 1, rating_change_a: -16, rating_change_b: 16 });

    a.socket.close();
    b.socket.close();
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
