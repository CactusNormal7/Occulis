import { runDurableObjectAlarm, runInDurableObject } from "cloudflare:test";
import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import type { ClientMessage, ServerMessage } from "@occulis/protocol";
import { HEARTBEAT, PROTOCOL_VERSION } from "@occulis/protocol";
import type { StartedMatch } from "./match-setup.js";
import { startTestMatch } from "./test-helpers.js";
import { ABSENCE_MS, DEPLOYMENT_MS, type MatchConfig } from "./match-do.js";
import type { ScenarioSnapshot } from "@occulis/core";

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
function createMatch(): Promise<StartedMatch> {
  return startTestMatch(`anne-${crypto.randomUUID()}`, `boris-${crypto.randomUUID()}`);
}

/** Un joueur connecté, dont on peut attendre un message d'un type donné. */
async function seat(matchId: string, token: string) {
  const response = await exports.default.fetch(
    `https://occulis.test/match/${matchId}?seat=${token}`,
    {
      headers: { Upgrade: "websocket" },
    },
  );
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

/** Attend que le DO ait noté le départ d'un siège : sa fermeture lui parvient en différé. */
async function absentSince(stub: DurableObjectStub, side: "A" | "B"): Promise<number> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const since = await runInDurableObject(stub, (_instance, state) =>
      state.storage.get<number>(`absent:${side}`),
    );
    if (since !== undefined) return since;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`départ de ${side} jamais noté`);
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
      const response = await exports.default.fetch(
        `https://occulis.test/match/${match.matchId}?seat=${token}`,
        {
          headers: { Upgrade: "websocket" },
        },
      );
      expect(response.status).toBe(403);
    }
  });

  it("ne crée aucune partie ni aucun profil sur une requête anonyme", async () => {
    const [playerA, playerB] = [`anne-${crypto.randomUUID()}`, `boris-${crypto.randomUUID()}`];
    const response = await exports.default.fetch("https://occulis.test/api/matches", {
      method: "POST",
      body: JSON.stringify({ playerA, playerB }),
    });

    expect(response.status).toBe(404);
    const created = await env.DB.prepare("SELECT COUNT(*) AS n FROM players WHERE id IN (?, ?)")
      .bind(playerA, playerB)
      .first<{ n: number }>();
    expect(created?.n).toBe(0);
  });

  it("fige la carte à la création, et la joue même si elle diffère du registre", async () => {
    const match = await createMatch();
    const row = await env.DB.prepare("SELECT map FROM matches WHERE id = ?")
      .bind(match.matchId)
      .first<{ map: string }>();
    const map = JSON.parse(row?.map ?? "null") as ScenarioSnapshot;
    expect(map.tiles.length).toBeGreaterThan(0);

    const a = await seat(match.matchId, match.seats.A);
    expect((await a.awaitKind("welcome")).board).toEqual(map.tiles);

    // Une carte retouchée dans le registre ne doit rien changer : seule compte la copie figée.
    const stub = env.MATCH.get(env.MATCH.idFromName(match.matchId));
    await runInDurableObject(stub, async (instance, state) => {
      const config = await state.storage.get<MatchConfig>("config");
      if (config?.map === undefined) throw new Error("carte absente de la configuration");
      await state.storage.put("config", {
        ...config,
        map: { ...config.map, tiles: config.map.tiles.map((tile) => ({ ...tile, height: 0 })) },
      });
      (instance as unknown as { live: unknown }).live = null;
    });
    a.send({ kind: "hello", protocol: PROTOCOL_VERSION });
    expect((await a.awaitKind("welcome")).board.every((tile) => tile.height === 0)).toBe(true);

    a.socket.close();
  });

  it("ouvre la partie par le déploiement : zones, équipe par défaut, cartes des joueurs", async () => {
    const match = await createMatch();
    const a = await seat(match.matchId, match.seats.A);

    expect((await a.awaitKind("welcome")).player).toBe("A");
    const deployment = await a.awaitKind("deployment");
    expect(deployment.zone).toHaveLength(16);
    expect(deployment.opponentZone).toHaveLength(16);
    expect(deployment.defaultTeam).toHaveLength(6);
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
    expect((await a.awaitKind("rejected")).error).toMatchObject({
      code: "wrong-count",
      role: "commander",
    });

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
    expect(view.ownPieces.map((piece) => piece.id).sort()).toEqual([
      "a-0",
      "a-1",
      "a-2",
      "a-3",
      "a-4",
      "a-5",
    ]);
    // Les zones de la carte n'ont pas de vue mutuelle : rien de B ne doit passer.
    expect(view.visibleEnemies).toEqual([]);
    expect(JSON.stringify(view)).not.toContain('"b-');
    await b.awaitKind("view");

    const row = await env.DB.prepare("SELECT setup FROM matches WHERE id = ?")
      .bind(match.matchId)
      .first<{ setup: string | null }>();
    expect(JSON.parse(row?.setup ?? "[]")).toHaveLength(12);

    a.socket.close();
    b.socket.close();
  });

  it("pose l'équipe par défaut de qui n'a rien envoyé à l'échéance", async () => {
    const match = await createMatch();
    const a = await seat(match.matchId, match.seats.A);
    const { defaultTeam } = await a.awaitKind("deployment");
    // Une équipe différente du défaut, pour vérifier qu'elle est bien celle retenue.
    const mine = defaultTeam.map((entry, index) =>
      index === 0 ? { ...entry, coord: { x: 0, y: 8 } } : entry,
    );
    a.send({ kind: "deploy", team: mine });
    await a.awaitKind("deployment-update");

    // Le temps ne s'avance pas dans workerd : on avance l'échéance elle-même.
    const stub = env.MATCH.get(env.MATCH.idFromName(match.matchId));
    await runInDurableObject(stub, (_instance, state) => state.storage.put("deadline", 0));
    expect(await runDurableObjectAlarm(stub)).toBe(true);
    const view = (await a.awaitKind("view")).view;
    expect(view.ownPieces.find((piece) => piece.id === "a-0")?.coord).toEqual({ x: 0, y: 8 });

    const row = await env.DB.prepare("SELECT setup FROM matches WHERE id = ?")
      .bind(match.matchId)
      .first<{ setup: string }>();
    const setup = JSON.parse(row?.setup ?? "[]") as { owner: string }[];
    expect(setup.filter((piece) => piece.owner === "B")).toHaveLength(6);

    a.socket.close();
  });

  it("refuse une action venue du joueur qui n'est pas au trait", async () => {
    const { a, b } = await deployed(await createMatch());
    await a.awaitKind("view");
    await b.awaitKind("view");

    // `core` vérifie que la pièce est au trait, pas que l'expéditeur en est le
    // propriétaire : sans le contrôle du serveur, B jouerait les pièces de A.
    b.send({ kind: "action", action: { kind: "move", pieceId: "a-4", to: { x: 1, y: 5 } } });
    expect((await b.awaitKind("rejected")).error).toEqual({
      code: "not-your-turn",
      activePlayer: "A",
    });

    a.socket.close();
    b.socket.close();
  });

  it("ignore un coup mal formé, sans rien écrire au log", async () => {
    const match = await createMatch();
    const { a, b } = await deployed(match);
    await a.awaitKind("view");
    await b.awaitKind("view");

    // Des coordonnées en texte passeraient `coordKey()` et finiraient telles quelles en D1.
    a.socket.send(
      JSON.stringify({
        kind: "action",
        action: { kind: "move", pieceId: "a-4", to: { x: "1", y: "5" } },
      }),
    );
    a.socket.send("pas du JSON");
    a.drain();
    a.send({ kind: "action", action: { kind: "move", pieceId: "a-4", to: { x: 1, y: 5 } } });
    expect((await a.awaitKind("view")).view.turn).toBe(1);

    const logged = await env.DB.prepare("SELECT seq, action FROM match_actions WHERE match_id = ?")
      .bind(match.matchId)
      .all<{ seq: number; action: string }>();
    expect(logged.results).toEqual([
      { seq: 0, action: '{"kind":"move","pieceId":"a-4","to":{"x":1,"y":5}}' },
    ]);

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
    expect(logged.results).toEqual([
      { seq: 0, action: '{"kind":"move","pieceId":"a-4","to":{"x":1,"y":5}}' },
    ]);

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
    expect((await a.awaitKind("rejected")).error).toEqual({
      code: "unreachable",
      to: { x: 9, y: 9 },
    });

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

    const row = await env.DB.prepare(
      "SELECT finished_at, outcome, rating_change_a FROM matches WHERE id = ?",
    )
      .bind(match.matchId)
      .first<{
        finished_at: number | null;
        outcome: string | null;
        rating_change_a: number | null;
      }>();
    expect(row?.finished_at).not.toBeNull();
    expect(row?.outcome).toBe('{"kind":"victory","winner":"B","reason":"resignation"}');
    expect(row?.rating_change_a).toBeNull();

    a.socket.close();
    b.socket.close();
  });

  it("accepte l'abandon hors tour, au nom du siège et non du message", async () => {
    const match = await createMatch();
    const { a, b } = await deployed(match);
    await b.awaitKind("view");
    b.drain();

    // A est au trait ; B quitte la partie et tente de faire abandonner A à sa place.
    b.send({ kind: "action", action: { kind: "resign", player: "A" } });
    const view = (await b.awaitKind("view")).view;
    expect(view.outcome).toEqual({ kind: "victory", winner: "A", reason: "resignation" });

    const row = await env.DB.prepare("SELECT finished_at FROM matches WHERE id = ?")
      .bind(match.matchId)
      .first<{ finished_at: number | null }>();
    expect(row?.finished_at).not.toBeNull();
    const logged = await env.DB.prepare("SELECT action FROM match_actions WHERE match_id = ?")
      .bind(match.matchId)
      .first<{ action: string }>();
    expect(JSON.parse(logged?.action ?? "null")).toEqual({ kind: "resign", player: "B" });

    a.socket.close();
    b.socket.close();
  });

  it("fait perdre par forfait le siège absent depuis trop longtemps", async () => {
    const match = await createMatch();
    const { a, b } = await deployed(match);
    await a.awaitKind("view");
    await b.awaitKind("view");
    a.drain();

    b.socket.close();
    const stub = env.MATCH.get(env.MATCH.idFromName(match.matchId));
    const since = await absentSince(stub, "B");
    expect(since).toBeTypeOf("number");

    // Le temps ne s'avance pas dans workerd : on recule le départ.
    await runInDurableObject(stub, (_instance, state) =>
      state.storage.put("absent:B", Date.now() - ABSENCE_MS - 1),
    );
    expect(await runDurableObjectAlarm(stub)).toBe(true);
    const view = (await a.awaitKind("view")).view;
    expect(view.outcome).toEqual({ kind: "victory", winner: "A", reason: "resignation" });

    const row = await env.DB.prepare("SELECT finished_at FROM matches WHERE id = ?")
      .bind(match.matchId)
      .first<{ finished_at: number | null }>();
    expect(row?.finished_at).not.toBeNull();
    a.socket.close();
  });

  it("ne fait rien perdre à qui revient à temps — un rechargement de page", async () => {
    const match = await createMatch();
    const { a, b } = await deployed(match);
    await a.awaitKind("view");
    await b.awaitKind("view");

    b.socket.close();
    const stub = env.MATCH.get(env.MATCH.idFromName(match.matchId));
    await absentSince(stub, "B");

    const back = await seat(match.matchId, match.seats.B);
    expect((await back.awaitKind("view")).view.outcome).toBeNull();
    const cleared = await runInDurableObject(stub, (_instance, state) =>
      state.storage.get("absent:B"),
    );
    expect(cleared).toBeUndefined();

    a.socket.close();
    back.socket.close();
  });

  it("fait varier l'Elo des deux joueurs à la fin d'une partie classée", async () => {
    const [anne, boris] = [`anne-${crypto.randomUUID()}`, `boris-${crypto.randomUUID()}`];
    const match = await startTestMatch(anne, boris, { rated: true });
    const { a, b } = await deployed(match);
    await a.awaitKind("view");
    a.drain();

    a.send({ kind: "action", action: { kind: "resign" } });
    await a.awaitKind("view");

    const elo = async (id: string) =>
      (
        await env.DB.prepare("SELECT elo FROM players WHERE id = ?")
          .bind(id)
          .first<{ elo: number }>()
      )?.elo;
    expect(await elo(anne)).toBe(1184);
    expect(await elo(boris)).toBe(1216);
    const row = await env.DB.prepare(
      "SELECT rated, rating_change_a, rating_change_b FROM matches WHERE id = ?",
    )
      .bind(match.matchId)
      .first();
    expect(row).toEqual({ rated: 1, rating_change_a: -16, rating_change_b: 16 });

    a.socket.close();
    b.socket.close();
  });

  it("retente une clôture non inscrite sans compter l'Elo deux fois", async () => {
    const [anne, boris] = [`anne-${crypto.randomUUID()}`, `boris-${crypto.randomUUID()}`];
    const match = await startTestMatch(anne, boris, { rated: true });
    const { a, b } = await deployed(match);
    await a.awaitKind("view");
    a.drain();
    a.send({ kind: "action", action: { kind: "resign" } });
    await a.awaitKind("view");

    // Comme si D1 avait répondu en erreur après avoir pourtant écrit le lot.
    const stub = env.MATCH.get(env.MATCH.idFromName(match.matchId));
    await runInDurableObject(stub, async (_instance, state) => {
      await state.storage.put("unrecorded-outcome", true);
      // Dans le futur : `runDurableObjectAlarm` la déclenche aussitôt, sans que le
      // runtime la devance.
      await state.storage.setAlarm(Date.now() + 60_000);
    });
    expect(await runDurableObjectAlarm(stub)).toBe(true);

    const elo = async (id: string) =>
      (
        await env.DB.prepare("SELECT elo FROM players WHERE id = ?")
          .bind(id)
          .first<{ elo: number }>()
      )?.elo;
    expect(await elo(anne)).toBe(1184);
    expect(await elo(boris)).toBe(1216);
    expect(
      await runInDurableObject(stub, (_instance, state) => state.storage.get("unrecorded-outcome")),
    ).toBeUndefined();

    a.socket.close();
    b.socket.close();
  });

  it("rend les mêmes vues après éviction, l'état n'étant qu'un cache du log", async () => {
    const match = await createMatch();
    const { a, b } = await deployed(match);
    await a.awaitKind("view");
    await b.awaitKind("view");
    a.drain();
    b.drain();
    a.send({ kind: "action", action: { kind: "move", pieceId: "a-4", to: { x: 1, y: 5 } } });
    const before = { A: (await a.awaitKind("view")).view, B: (await b.awaitKind("view")).view };

    // Ce que l'hibernation fait au DO : la mémoire tombe, le stockage et D1 restent.
    const stub = env.MATCH.get(env.MATCH.idFromName(match.matchId));
    await runInDurableObject(stub, (instance) => {
      (instance as unknown as { live: unknown }).live = null;
    });
    // Un `hello` ne renvoie sa vue qu'à qui le dit : chaque camp redemande la sienne.
    a.send({ kind: "hello", protocol: PROTOCOL_VERSION });
    b.send({ kind: "hello", protocol: PROTOCOL_VERSION });

    expect((await a.awaitKind("view")).view).toEqual(before.A);
    expect((await b.awaitKind("view")).view).toEqual(before.B);

    a.socket.close();
    b.socket.close();
  });

  it("n'ouvre la partie qu'une fois quand une équipe arrive pendant l'alarme d'échéance", async () => {
    const match = await createMatch();
    const a = await seat(match.matchId, match.seats.A);
    const b = await seat(match.matchId, match.seats.B);
    a.send({ kind: "deploy", team: (await a.awaitKind("deployment")).defaultTeam });
    const { defaultTeam } = await b.awaitKind("deployment");
    await b.awaitKind("deployment-update");
    const mine = defaultTeam.map((entry, index) =>
      index === 0 ? { ...entry, coord: { x: 13, y: 1 } } : entry,
    );

    // L'équipe de B et l'alarme de l'échéance se croisent : l'une des deux ouvre la
    // partie, l'autre doit trouver le déploiement clos — jamais un second départ.
    const stub = env.MATCH.get(env.MATCH.idFromName(match.matchId));
    await runInDurableObject(stub, (_instance, state) => state.storage.put("deadline", 0));
    b.send({ kind: "deploy", team: mine });
    await runDurableObjectAlarm(stub);
    await a.awaitKind("view");

    const stored = await runInDurableObject(stub, (_instance, state) =>
      state.storage.get<unknown[]>("setup"),
    );
    const row = await env.DB.prepare("SELECT setup FROM matches WHERE id = ?")
      .bind(match.matchId)
      .first<{ setup: string }>();
    expect(JSON.parse(row?.setup ?? "null")).toEqual(stored);

    a.socket.close();
    b.socket.close();
  });

  it("se resynchronise sur le log quand l'écriture d'un coup aboutit sans réponse", async () => {
    const match = await createMatch();
    const { a, b } = await deployed(match);
    await a.awaitKind("view");
    await b.awaitKind("view");
    a.drain();
    b.drain();

    // D1 écrit le coup, mais sa réponse se perd : le DO reçoit une erreur.
    const stub = env.MATCH.get(env.MATCH.idFromName(match.matchId));
    await runInDurableObject(stub, (instance) => {
      const real = env.DB;
      const lossy = new Proxy(real, {
        get(target, key) {
          if (key !== "prepare") {
            const value: unknown = Reflect.get(target, key, target);
            return typeof value === "function" ? value.bind(target) : value;
          }
          return (sql: string) => {
            const statement = target.prepare(sql);
            if (!sql.startsWith("INSERT INTO match_actions")) return statement;
            return {
              bind: (...values: unknown[]) => ({
                run: async () => {
                  await statement.bind(...values).run();
                  throw new Error("réponse perdue");
                },
              }),
            };
          };
        },
      });
      (instance as unknown as { env: Env }).env = { ...env, DB: lossy };
    });

    // Le coup est au log : relue de D1, la position le montre joué, et le trait passe.
    a.send({ kind: "action", action: { kind: "move", pieceId: "a-4", to: { x: 1, y: 5 } } });
    expect((await a.awaitKind("view")).view.activePlayer).toBe("B");
    const forB = (await b.awaitKind("view")).view;
    expect(forB.activePlayer).toBe("B");

    // Le cache ne reste pas figé : le coup suivant s'inscrit sans buter sur la clé du log.
    await runInDurableObject(stub, (instance) => {
      (instance as unknown as { env: Env }).env = env;
    });
    const reply = forB.legalActions[0];
    if (reply === undefined) throw new Error("aucun coup légal pour B");
    b.send({ kind: "action", action: reply });
    expect((await a.awaitKind("view")).view.turn).toBe(2);

    const logged = await env.DB.prepare("SELECT seq FROM match_actions WHERE match_id = ?")
      .bind(match.matchId)
      .all<{ seq: number }>();
    expect(logged.results.map((row) => row.seq)).toEqual([0, 1]);

    a.socket.close();
    b.socket.close();
  });

  it("ne surveille le battement de cœur que tant que la partie dure", async () => {
    const match = await createMatch();
    const { a, b } = await deployed(match);
    await a.awaitKind("view");
    await b.awaitKind("view");
    const stub = env.MATCH.get(env.MATCH.idFromName(match.matchId));
    const alarm = () => runInDurableObject(stub, (_instance, state) => state.storage.getAlarm());
    expect(await alarm()).not.toBeNull();

    a.drain();
    a.send({ kind: "action", action: { kind: "resign" } });
    expect((await a.awaitKind("view")).view.outcome).not.toBeNull();

    // La partie finie, l'alarme qui passe ne se réarme plus : aucun réveil inutile.
    await runDurableObjectAlarm(stub);
    expect(await alarm()).toBeNull();

    a.socket.close();
    b.socket.close();
  });

  it("répond au battement de cœur sans passer par le protocole", async () => {
    const match = await createMatch();
    const response = await exports.default.fetch(
      `https://occulis.test/match/${match.matchId}?seat=${match.seats.A}`,
      { headers: { Upgrade: "websocket" } },
    );
    const socket = response.webSocket;
    if (socket === null) throw new Error("pas de WebSocket dans la réponse");
    socket.accept();
    const reply = new Promise<string>((resolve) => {
      socket.addEventListener("message", (event) => resolve(String(event.data)));
    });
    socket.send(HEARTBEAT.ping);
    expect(await reply).toBe(HEARTBEAT.pong);
    socket.close();
  });

  it("ferme la connexion d'un client au protocole incompatible", async () => {
    const match = await createMatch();
    const response = await exports.default.fetch(
      `https://occulis.test/match/${match.matchId}?seat=${match.seats.A}`,
      {
        headers: { Upgrade: "websocket" },
      },
    );
    const socket = response.webSocket;
    if (socket === null) throw new Error("pas de WebSocket dans la réponse");
    socket.accept();

    const refused = new Promise<ServerMessage>((resolve) => {
      socket.addEventListener("message", (event) =>
        resolve(JSON.parse(String(event.data)) as ServerMessage),
      );
    });
    socket.send(JSON.stringify({ kind: "hello", protocol: PROTOCOL_VERSION + 1 }));

    expect(await refused).toEqual({ kind: "protocol-mismatch", expected: PROTOCOL_VERSION });
  });
});
