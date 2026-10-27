import { runDurableObjectAlarm, runInDurableObject } from "cloudflare:test";
import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import {
  PROTOCOL_VERSION,
  type Challenge,
  type ChatMessage,
  type ChatPage,
  type FriendProfile,
  type FriendsOverview,
  type MeMatchDetail,
  type PlayerSearchResult,
  type ServerMessage,
  type SocialServerMessage,
} from "@occulis/protocol";
import { post, signUp, startTestMatch, unique } from "../test-helpers.js";
import type { StartedMatch } from "../match-setup.js";

/**
 * Le système d'amis dans workerd : les routes, le canal social et le spectateur.
 * Ce qu'on éprouve d'abord, ce sont les cloisons — une donnée d'ami ne s'ouvre qu'à un
 * ami, un blocage coupe tout, un joueur ne regarde jamais sa propre partie.
 */

const ORIGIN = "https://occulis.test";

async function call(
  method: string,
  path: string,
  cookie: string,
  body?: unknown,
): Promise<Response> {
  const headers: Record<string, string> = {
    Cookie: cookie,
    Origin: ORIGIN,
    "Content-Type": "application/json",
  };
  return exports.default.fetch(`${ORIGIN}${path}`, {
    method,
    headers,
    body: body === undefined ? null : JSON.stringify(body),
  });
}

const get = (path: string, cookie: string) => call("GET", path, cookie);

async function json<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

interface Someone {
  readonly handle: string;
  readonly cookie: string;
  readonly id: string;
}

async function someone(prefix: string): Promise<Someone> {
  const handle = unique(prefix);
  const cookie = await signUp(handle);
  const row = await env.DB.prepare("SELECT player_id FROM users WHERE email = lower(?)")
    .bind(`${handle}@occulis.test`)
    .first<{ player_id: string }>();
  if (row === null) throw new Error(`compte introuvable : ${handle}`);
  return { handle, cookie, id: row.player_id };
}

async function befriend(a: Someone, b: Someone): Promise<void> {
  expect((await call("POST", "/api/friends/requests", a.cookie, { playerId: b.id })).status).toBe(
    200,
  );
  expect((await call("POST", `/api/friends/requests/${a.id}/accept`, b.cookie)).status).toBe(200);
}

/** Un socket et sa boîte de réception, avec une attente par genre de message. */
async function listen<M extends { kind: string }>(path: string, cookie: string, hello: unknown) {
  const response = await exports.default.fetch(`${ORIGIN}${path}`, {
    headers: { Upgrade: "websocket", Cookie: cookie },
  });
  expect(response.status).toBe(101);
  const socket = response.webSocket;
  if (socket === null) throw new Error("pas de WebSocket");
  socket.accept();

  const received: M[] = [];
  const pending: (() => void)[] = [];
  socket.addEventListener("message", (event) => {
    received.push(JSON.parse(String(event.data)) as M);
    for (const wake of pending.splice(0)) wake();
  });
  socket.send(JSON.stringify(hello));

  const awaiting = <K extends M["kind"]>(kind: K, from = 0) =>
    new Promise<Extract<M, { kind: K }>>((resolve, reject) => {
      const deadline = setTimeout(() => reject(new Error(`aucun « ${kind} »`)), 3000);
      const look = (): void => {
        const found = received.slice(from).find((message) => message.kind === kind);
        if (found !== undefined) {
          clearTimeout(deadline);
          resolve(found as Extract<M, { kind: K }>);
          return;
        }
        pending.push(look);
      };
      look();
    });

  return { socket, received, awaiting };
}

const social = (cookie: string, surface: "game" | "profile" = "game") =>
  listen<SocialServerMessage>(`/api/social?surface=${surface}`, cookie, {
    kind: "hello",
    protocol: PROTOCOL_VERSION,
  });

describe("amis : demandes et liste", () => {
  it("demande, accepte, liste, puis retire", async () => {
    const anne = await someone("anne");
    const boris = await someone("boris");

    expect(
      await json(await call("POST", "/api/friends/requests", anne.cookie, { playerId: boris.id })),
    ).toEqual({
      relation: "outgoing",
    });
    const pending = await json<FriendsOverview>(await get("/api/friends", boris.cookie));
    expect(pending.incoming.map((request) => request.id)).toEqual([anne.id]);

    expect(
      (await call("POST", `/api/friends/requests/${anne.id}/accept`, boris.cookie)).status,
    ).toBe(200);
    const overview = await json<FriendsOverview>(await get("/api/friends", anne.cookie));
    expect(overview.friends.map((friend) => friend.handle)).toEqual([boris.handle]);
    expect(overview.outgoing).toEqual([]);

    expect((await call("DELETE", `/api/friends/${boris.id}`, anne.cookie)).status).toBe(200);
    expect((await json<FriendsOverview>(await get("/api/friends", boris.cookie))).friends).toEqual(
      [],
    );
  });

  it("transforme une demande croisée en amitié", async () => {
    const anne = await someone("anne");
    const boris = await someone("boris");
    await call("POST", "/api/friends/requests", anne.cookie, { playerId: boris.id });
    expect(
      await json(await call("POST", "/api/friends/requests", boris.cookie, { playerId: anne.id })),
    ).toEqual({
      relation: "friend",
    });
    expect(
      (await json<FriendsOverview>(await get("/api/friends", anne.cookie))).friends,
    ).toHaveLength(1);
  });

  it("refuse une demande à soi-même ou à un profil sans compte", async () => {
    const anne = await someone("anne");
    expect(
      (await call("POST", "/api/friends/requests", anne.cookie, { playerId: anne.id })).status,
    ).toBe(400);
    expect(
      (await call("POST", "/api/friends/requests", anne.cookie, { playerId: "personne" })).status,
    ).toBe(404);
  });

  it("exige une session, et refuse une écriture d'une autre origine", async () => {
    expect((await exports.default.fetch(`${ORIGIN}/api/friends`)).status).toBe(401);
    const anne = await someone("anne");
    const response = await exports.default.fetch(`${ORIGIN}/api/friends/requests`, {
      method: "POST",
      headers: { Cookie: anne.cookie, Origin: "https://ailleurs.test" },
      body: "{}",
    });
    expect(response.status).toBe(403);
  });
});

describe("amis : recherche et blocage", () => {
  it("trouve par préfixe, sans casse, et dit la relation", async () => {
    const stem = `zq${crypto.randomUUID().slice(0, 6)}`;
    const anne = await someone(stem);
    const boris = await someone(stem.toUpperCase());
    await call("POST", "/api/friends/requests", anne.cookie, { playerId: boris.id });

    const found = await json<PlayerSearchResult[]>(
      await get(`/api/players/search?q=${stem}`, anne.cookie),
    );
    expect(found).toEqual([{ id: boris.id, handle: boris.handle, relation: "outgoing" }]);
    expect(await json(await get("/api/players/search?q=z", anne.cookie))).toEqual([]);
  });

  it("bloquer coupe l'amitié, cache le bloqueur et refuse ses demandes", async () => {
    const stem = `zb${crypto.randomUUID().slice(0, 6)}`;
    const anne = await someone(stem);
    const boris = await someone(stem);
    await befriend(anne, boris);

    expect((await call("POST", "/api/blocks", anne.cookie, { playerId: boris.id })).status).toBe(
      200,
    );
    expect((await json<FriendsOverview>(await get("/api/friends", boris.cookie))).friends).toEqual(
      [],
    );
    expect(
      (await json<FriendsOverview>(await get("/api/friends", anne.cookie))).blocked.map(
        (p) => p.id,
      ),
    ).toEqual([boris.id]);
    expect(await json(await get(`/api/players/search?q=${stem}`, boris.cookie))).toEqual([]);

    const refused = await call("POST", "/api/friends/requests", boris.cookie, {
      playerId: anne.id,
    });
    expect(refused.status).toBe(403);
    expect(await json(refused)).toEqual({ code: "UNAVAILABLE" });
    expect(
      (await call("POST", `/api/friends/${anne.id}/messages`, boris.cookie, { body: "coucou" }))
        .status,
    ).toBe(403);

    expect((await call("DELETE", `/api/blocks/${boris.id}`, anne.cookie)).status).toBe(200);
    expect(
      (await call("POST", "/api/friends/requests", boris.cookie, { playerId: anne.id })).status,
    ).toBe(200);
  });
});

describe("amis : fiche, historique et replay", () => {
  it("n'ouvre la fiche qu'aux amis, et rejoue du point de vue de l'ami", async () => {
    const anne = await someone("anne");
    const boris = await someone("boris");
    const stranger = await someone("chloe");
    await befriend(anne, boris);

    const { matchId } = await startTestMatch(boris.id, stranger.id);
    await env.DB.batch([
      env.DB.prepare("INSERT INTO match_actions (match_id, seq, action) VALUES (?, 0, ?)").bind(
        matchId,
        JSON.stringify({ kind: "resign" }),
      ),
      env.DB.prepare("UPDATE matches SET finished_at = ?, outcome = ? WHERE id = ?").bind(
        Date.now(),
        JSON.stringify({ kind: "victory", winner: "B", reason: "resignation" }),
        matchId,
      ),
    ]);

    const profile = await json<FriendProfile>(await get(`/api/friends/${boris.id}`, anne.cookie));
    expect(profile).toMatchObject({
      id: boris.id,
      handle: boris.handle,
      record: { played: 1, lost: 1 },
    });
    expect((await get(`/api/friends/${boris.id}`, stranger.cookie)).status).toBe(403);
    expect((await get(`/api/friends/${boris.id}/matches`, stranger.cookie)).status).toBe(403);

    const detail = await json<MeMatchDetail>(
      await get(`/api/friends/${boris.id}/matches/${matchId}`, anne.cookie),
    );
    expect(detail).toMatchObject({ seat: "A", result: "lost", opponentId: stranger.id });
    for (const frame of detail.frames) {
      expect(Object.keys(frame.visible)).toEqual(["A", "B"]);
    }
  });
});

describe("amis : messages", () => {
  it("écrit, pousse en direct, pagine et marque lu", async () => {
    const anne = await someone("anne");
    const boris = await someone("boris");
    await befriend(anne, boris);
    const inbox = await social(boris.cookie, "profile");

    const sent = await json<ChatMessage>(
      await call("POST", `/api/friends/${boris.id}/messages`, anne.cookie, { body: " salut " }),
    );
    expect(sent.body).toBe("salut");
    const pushed = await inbox.awaiting("message");
    expect(pushed.message.id).toBe(sent.id);

    const overview = await json<FriendsOverview>(await get("/api/friends", boris.cookie));
    expect(overview.friends[0]?.unread).toBe(1);
    const page = await json<ChatPage>(await get(`/api/friends/${anne.id}/messages`, boris.cookie));
    expect(page.messages.map((message) => message.body)).toEqual(["salut"]);

    expect(
      await json(await call("POST", `/api/friends/${anne.id}/messages/read`, boris.cookie)),
    ).toEqual({ read: 1 });
    expect(
      (await json<FriendsOverview>(await get("/api/friends", boris.cookie))).friends[0]?.unread,
    ).toBe(0);
    inbox.socket.close();
  });

  it("limite le débit d'envoi", async () => {
    const anne = await someone("anne");
    const boris = await someone("boris");
    await befriend(anne, boris);
    const statuses: number[] = [];
    for (let index = 0; index < 21; index += 1) {
      statuses.push(
        (
          await call("POST", `/api/friends/${boris.id}/messages`, anne.cookie, {
            body: `n°${index}`,
          })
        ).status,
      );
    }
    expect(statuses.slice(0, 20).every((status) => status === 200)).toBe(true);
    expect(statuses[20]).toBe(429);
  });
});

describe("amis : présence et défi", () => {
  // Le départ ne s'annonce que par `webSocketClose`, que le runtime n'appelle que sur un
  // socket accepté pour l'hibernation : ce test tombe si `SocialDO` cesse d'hiberner.
  it("annonce la présence d'un ami, puis son départ", async () => {
    const anne = await someone("anne");
    const boris = await someone("boris");
    await befriend(anne, boris);
    const watcher = await social(anne.cookie, "profile");

    const theirs = await social(boris.cookie);
    expect(await watcher.awaiting("presence")).toEqual({
      kind: "presence",
      playerId: boris.id,
      online: true,
    });
    expect(
      (await json<FriendsOverview>(await get("/api/friends", anne.cookie))).friends[0]?.online,
    ).toBe(true);

    const from = watcher.received.length;
    theirs.socket.close();
    expect(await watcher.awaiting("presence", from)).toEqual({
      kind: "presence",
      playerId: boris.id,
      online: false,
    });
    watcher.socket.close();
  });

  it("assoit les deux joueurs d'un défi accepté, une seule fois", async () => {
    const anne = await someone("anne");
    const boris = await someone("boris");
    await befriend(anne, boris);
    const anneGame = await social(anne.cookie);
    const borisGame = await social(boris.cookie);

    expect((await call("POST", `/api/friends/${boris.id}/challenge`, anne.cookie)).status).toBe(
      200,
    );
    expect((await borisGame.awaiting("challenge")).challenge.from.id).toBe(anne.id);

    expect(
      (await call("POST", `/api/friends/${anne.id}/challenge/accept`, boris.cookie)).status,
    ).toBe(200);
    const a = await anneGame.awaiting("matched");
    const b = await borisGame.awaiting("matched");
    expect(a.matchId).toBe(b.matchId);
    expect([a.player, b.player]).toEqual(["A", "B"]);
    // Une seconde acceptation ne crée rien : les deux sont désormais en partie.
    expect(
      (await call("POST", `/api/friends/${anne.id}/challenge/accept`, boris.cookie)).status,
    ).toBe(409);

    anneGame.socket.close();
    borisGame.socket.close();
  });

  it("refuse un défi quand l'un des deux joueurs est déjà en partie", async () => {
    const anne = await someone("anne");
    const boris = await someone("boris");
    const carla = await someone("carla");
    await befriend(anne, boris);
    const anneGame = await social(anne.cookie);
    await startTestMatch(boris.id, carla.id);

    const refused = await call("POST", `/api/friends/${boris.id}/challenge`, anne.cookie);
    expect(refused.status).toBe(409);
    expect(await json<{ code: string }>(refused)).toEqual({ code: "IN_MATCH" });

    anneGame.socket.close();
  });

  it("fait tomber un défi resté sans réponse à son échéance", async () => {
    const anne = await someone("anne");
    const boris = await someone("boris");
    await befriend(anne, boris);
    const anneGame = await social(anne.cookie);
    const borisGame = await social(boris.cookie);
    expect((await call("POST", `/api/friends/${boris.id}/challenge`, anne.cookie)).status).toBe(
      200,
    );
    await borisGame.awaiting("challenge");

    // Le temps ne s'avance pas dans workerd : on vieillit le défi lui-même.
    const stub = env.SOCIAL.get(env.SOCIAL.idFromName(anne.id));
    await runInDurableObject(stub, async (_instance, state) => {
      const outgoing = await state.storage.get<Map<string, Challenge>>("outgoing");
      const challenge = outgoing?.get(boris.id);
      if (outgoing === undefined || challenge === undefined) throw new Error("défi absent");
      outgoing.set(boris.id, { ...challenge, createdAt: 0 });
      await state.storage.put("outgoing", outgoing);
    });
    expect(await runDurableObjectAlarm(stub)).toBe(true);

    expect((await borisGame.awaiting("challenge-cancelled")).from).toBe(anne.id);
    expect(
      (await call("POST", `/api/friends/${anne.id}/challenge/accept`, boris.cookie)).status,
    ).toBe(404);

    anneGame.socket.close();
    borisGame.socket.close();
  });

  it("refuse un défi lancé sans le jeu ouvert", async () => {
    const anne = await someone("anne");
    const boris = await someone("boris");
    await befriend(anne, boris);
    expect((await call("POST", `/api/friends/${boris.id}/challenge`, anne.cookie)).status).toBe(
      409,
    );
  });
});

describe("amis : spectateur", () => {
  function matchOf(a: Someone, b: Someone): Promise<StartedMatch> {
    return startTestMatch(a.id, b.id);
  }

  const watch = (matchId: string, side: string, cookie: string) =>
    exports.default.fetch(`${ORIGIN}/match/${matchId}/watch?side=${side}`, {
      headers: { Upgrade: "websocket", Cookie: cookie },
    });

  it("montre à un ami exactement la vue de son camp, sans coups légaux, et rien du déploiement", async () => {
    const anne = await someone("anne");
    const boris = await someone("boris");
    const chloe = await someone("chloe");
    await befriend(anne, chloe);
    const { matchId, seats } = await matchOf(anne, boris);
    const hello = { kind: "hello", protocol: PROTOCOL_VERSION };

    const a = await listen<ServerMessage>(`/match/${matchId}?seat=${seats.A}`, "", hello);
    const b = await listen<ServerMessage>(`/match/${matchId}?seat=${seats.B}`, "", hello);
    const deploymentA = await a.awaiting("deployment");
    const deploymentB = await b.awaiting("deployment");
    const from = a.received.length;

    // Arrivé pendant le déploiement : le camp suivi, mais ni zone ni position.
    const spectator = await listen<ServerMessage>(
      `/match/${matchId}/watch?side=A`,
      chloe.cookie,
      hello,
    );
    expect(await spectator.awaiting("watching")).toMatchObject({ side: "A" });
    expect(await a.awaiting("spectators", from)).toEqual({ kind: "spectators", count: 1 });

    a.socket.send(JSON.stringify({ kind: "deploy", team: deploymentA.defaultTeam }));
    b.socket.send(JSON.stringify({ kind: "deploy", team: deploymentB.defaultTeam }));
    const own = await a.awaiting("view");
    const seen = await spectator.awaiting("view");
    expect(seen.view).toEqual({ ...own.view, legalActions: [] });
    expect(own.view.legalActions.length).toBeGreaterThan(0);
    expect(spectator.received.some((message) => message.kind === "deployment")).toBe(false);

    spectator.socket.send(JSON.stringify({ kind: "action", action: own.view.legalActions[0] }));
    expect(await spectator.awaiting("rejected")).toMatchObject({ error: { code: "unknown-seat" } });

    spectator.socket.close();
    a.socket.close();
    b.socket.close();
  });

  it("refuse l'adversaire, un non-ami, et un joueur qui refuse les spectateurs", async () => {
    const anne = await someone("anne");
    const boris = await someone("boris");
    const chloe = await someone("chloe");
    await befriend(anne, boris);
    const { matchId } = await matchOf(anne, boris);

    expect(await json(await watch(matchId, "A", boris.cookie))).toEqual({ code: "OWN_MATCH" });
    expect(await json(await watch(matchId, "A", chloe.cookie))).toEqual({ code: "NOT_FRIENDS" });

    await befriend(anne, chloe);
    expect((await call("POST", "/api/me/spectators", anne.cookie, { allow: false })).status).toBe(
      200,
    );
    expect(await json(await watch(matchId, "A", chloe.cookie))).toEqual({
      code: "SPECTATORS_REFUSED",
    });

    const overview = await json<FriendsOverview>(await get("/api/friends", chloe.cookie));
    expect(overview.friends[0]?.matches[0]).toMatchObject({
      id: matchId,
      side: "A",
      watchable: false,
    });
  });
});

describe("amis : suppression de compte", () => {
  it("efface les relations et les messages du compte supprimé", async () => {
    const anne = await someone("anne");
    const boris = await someone("boris");
    await befriend(anne, boris);
    await call("POST", `/api/friends/${boris.id}/messages`, anne.cookie, { body: "adieu" });

    const userId = (
      await env.DB.prepare("SELECT id FROM users WHERE player_id = ?")
        .bind(anne.id)
        .first<{ id: string }>()
    )?.id;
    expect((await post("/api/auth/delete-user", { callbackURL: "/" }, anne.cookie)).status).toBe(
      200,
    );
    const stored = await env.DB.prepare(
      "SELECT identifier FROM verifications WHERE value = ? AND identifier LIKE 'delete-account-%'",
    )
      .bind(userId)
      .first<{ identifier: string }>();
    const token = (stored?.identifier ?? "").replace("delete-account-", "");
    const confirmed = await exports.default.fetch(
      `${ORIGIN}/api/auth/delete-user/callback?token=${token}&callbackURL=/`,
      {
        headers: { Cookie: anne.cookie },
        redirect: "manual",
      },
    );
    expect(confirmed.status).toBe(302);
    expect((await json<FriendsOverview>(await get("/api/friends", boris.cookie))).friends).toEqual(
      [],
    );
    const left = await env.DB.prepare("SELECT COUNT(*) AS total FROM messages WHERE sender = ?")
      .bind(anne.id)
      .first<{ total: number }>();
    expect(left?.total).toBe(0);
  });
});
