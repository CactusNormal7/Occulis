import type { Challenge, SocialServerMessage } from "@occulis/protocol";
import type { Auth } from "../auth/better-auth.js";
import { type Caller, guardCaller } from "../auth/guard.js";
import { parsePage } from "../admin/paging.js";
import { listMyMatches, readCurrentMatch, readMyMatch } from "../me/queries.js";
import { callSocial, pushTo } from "../social-do.js";
import { checkMessage } from "./chat.js";
import {
  acceptRequest,
  block,
  deleteRequest,
  handleOf,
  insertMessage,
  isFriend,
  listMessages,
  markRead,
  pendingRequests,
  readFacts,
  readFriendProfile,
  readOverview,
  removeFriend,
  searchPlayers,
  sendRequest,
  unblock,
} from "./queries.js";
import { decideRequest } from "./relations.js";
import { prefixRange } from "./search.js";
import { readBody } from "../http.js";

/**
 * Les routes du système d'amis : `/api/friends/*`, `/api/players/search` et
 * `/api/blocks/*`. Même garde que le profil (`guardCaller`) : l'identité vient de la
 * session, toute écriture est refusée à une session d'emprunt.
 *
 * Elles exigent en plus une **adresse vérifiée**, comme la file d'attente : écrire à
 * quelqu'un ou le défier n'est pas ouvert à un compte jetable.
 *
 * Chaque écriture prévient ensuite les joueurs concernés par leur canal social
 * (`social-do.ts`) ; la donnée, elle, est déjà en D1.
 */
export async function handleSocial(
  auth: Auth,
  env: Env,
  request: Request,
  url: URL,
): Promise<Response | undefined> {
  const path = url.pathname;
  if (
    path !== "/api/friends" &&
    !path.startsWith("/api/friends/") &&
    path !== "/api/players/search" &&
    path !== "/api/blocks" &&
    !path.startsWith("/api/blocks/")
  ) {
    return undefined;
  }

  const caller = await guardCaller(auth, request, url);
  if (caller instanceof Response) return caller;
  if (!caller.session.user.emailVerified)
    return Response.json({ code: "EMAIL_UNVERIFIED" }, { status: 403 });
  const self = caller.playerId;
  const me = { id: self, handle: caller.session.user.name };
  const now = Date.now();
  const db = env.DB;
  const method = request.method;

  if (method === "GET" && path === "/api/friends")
    return Response.json(await readOverview(db, self));

  if (method === "GET" && path === "/api/players/search") {
    const range = prefixRange(url.searchParams.get("q"));
    return Response.json(range === undefined ? [] : await searchPlayers(db, self, range));
  }

  if (method === "POST" && path === "/api/friends/requests") {
    const { playerId } = await readBody(request);
    if (typeof playerId !== "string") return failure("UNKNOWN_PLAYER");
    const decision = decideRequest(
      self,
      playerId,
      await readFacts(db, self, playerId),
      await pendingRequests(db, self),
    );
    if (!decision.ok) return failure(decision.code);
    if (decision.action === "accept") {
      await acceptRequest(db, self, playerId, now);
      await pushTo(env, playerId, { kind: "friend-accepted", friend: me });
      return Response.json({ relation: "friend" });
    }
    if (decision.action === "send") {
      await sendRequest(db, self, playerId, now);
      await pushTo(env, playerId, { kind: "friend-request", from: me });
    }
    return Response.json({ relation: "outgoing" });
  }

  if (method === "POST" && path === "/api/blocks") {
    const { playerId } = await readBody(request);
    if (typeof playerId !== "string" || playerId === self) return failure("UNKNOWN_PLAYER");
    if ((await handleOf(db, playerId)) === undefined) return failure("UNKNOWN_PLAYER");
    await block(db, self, playerId, now);
    // Le bloqué voit seulement disparaître une relation, sans savoir pourquoi.
    await cancelChallengesBetween(env, self, playerId);
    await pushTo(env, playerId, { kind: "friends-changed" });
    return Response.json({ relation: "blocked" });
  }

  const blocked = path.match(/^\/api\/blocks\/([\w-]+)$/)?.[1];
  if (method === "DELETE" && blocked !== undefined) {
    return (await unblock(db, self, blocked))
      ? Response.json({ relation: "none" })
      : failure("NOT_FOUND");
  }

  const friendRequestPath = path.match(
    /^\/api\/friends\/requests\/([\w-]+)\/(accept|decline|cancel)$/,
  );
  if (method === "POST" && friendRequestPath !== null) {
    const [, other = "", verb] = friendRequestPath;
    if (verb === "accept") {
      if (!(await acceptRequest(db, self, other, now))) return failure("NOT_FOUND");
      await pushTo(env, other, { kind: "friend-accepted", friend: me });
      return Response.json({ relation: "friend" });
    }
    const removed =
      verb === "decline"
        ? await deleteRequest(db, other, self)
        : await deleteRequest(db, self, other);
    if (!removed) return failure("NOT_FOUND");
    await pushTo(env, other, { kind: "friends-changed" });
    return Response.json({ relation: "none" });
  }

  return handleFriendRoutes(env, request, url, caller, now);
}

/** Les données privées et les défis passent tous par la même vérification d'amitié. */
async function handleFriendRoutes(
  env: Env,
  request: Request,
  url: URL,
  caller: Caller,
  now: number,
): Promise<Response> {
  const db = env.DB;
  const self = caller.playerId;
  const me = { id: self, handle: caller.session.user.name };
  const method = request.method;
  const path = url.pathname;
  const friendPath = path.match(/^\/api\/friends\/([\w-]+)(\/.*)?$/);
  if (friendPath === null) return new Response("not found", { status: 404 });
  const friendId = friendPath[1] ?? "";
  const suffix = friendPath[2] ?? "";

  if (method === "DELETE" && suffix === "") {
    if (!(await removeFriend(db, self, friendId))) return failure("NOT_FOUND");
    await cancelChallengesBetween(env, self, friendId);
    await pushTo(env, friendId, { kind: "friends-changed" });
    return Response.json({ relation: "none" });
  }

  // Tout ce qui suit ouvre les données d'un ami, ou s'adresse à lui : l'amitié d'abord.
  if (!(await isFriend(db, self, friendId))) return failure("NOT_FRIENDS");

  if (method === "GET") {
    if (suffix === "") {
      const profile = await readFriendProfile(db, self, friendId);
      return profile === undefined ? failure("NOT_FRIENDS") : Response.json(profile);
    }
    if (suffix === "/matches")
      return Response.json(await listMyMatches(db, friendId, parsePage(url.searchParams)));
    const matchId = suffix.match(/^\/matches\/([\w-]+)$/)?.[1];
    if (matchId !== undefined) {
      // Le replay **de son point de vue**, exactement celui qu'il voit lui-même.
      const match = await readMyMatch(db, friendId, matchId);
      if (match === "unknown") return new Response("not found", { status: 404 });
      if (match === "ongoing") return Response.json({ code: "MATCH_ONGOING" }, { status: 409 });
      return Response.json(match);
    }
    if (suffix === "/messages") {
      // La lecture seule de l'emprunt ne va pas jusqu'aux messages privés : ils restent
      // entre les deux amis, administrateur compris (décision du 2026-10-21).
      if (caller.impersonating) return failure("PRIVATE");
      const raw = Number.parseInt(url.searchParams.get("before") ?? "", 10);
      return Response.json(
        await listMessages(
          db,
          self,
          friendId,
          Number.isFinite(raw) ? raw : Number.MAX_SAFE_INTEGER,
        ),
      );
    }
  }

  if (method === "POST") {
    if (suffix === "/messages") {
      const { body } = await readBody(request);
      const checked = checkMessage(body);
      if (!checked.ok) return failure(checked.code);
      const message = await insertMessage(db, self, friendId, checked.body, now);
      if (message === undefined) return failure("RATE_LIMITED");
      const pushed: SocialServerMessage = { kind: "message", message };
      // Vers soi aussi : ses autres pages ouvertes affichent le même fil.
      await Promise.all([pushTo(env, friendId, pushed), pushTo(env, self, pushed)]);
      return Response.json(message);
    }
    if (suffix === "/messages/read")
      return Response.json({ read: await markRead(db, self, friendId, now) });

    if (suffix === "/challenge") {
      const target = await handleOf(db, friendId);
      if (target === undefined) return failure("NOT_FRIENDS");
      if (await eitherInMatch(db, self, friendId)) return failure("IN_MATCH");
      const challenge: Challenge = { from: me, to: target, createdAt: now };
      return callSocial(env, self, "/challenge", challenge);
    }
    if (suffix === "/challenge/accept") {
      // Revérifié à l'acceptation : l'un des deux a pu entrer en partie entre-temps.
      if (await eitherInMatch(db, self, friendId)) return failure("IN_MATCH");
      return callSocial(env, friendId, "/challenge/accept", { to: self });
    }
    if (suffix === "/challenge/decline") {
      return cancelChallenge(env, friendId, self);
    }
  }

  if (method === "DELETE" && suffix === "/challenge") {
    return cancelChallenge(env, self, friendId);
  }

  return new Response("not found", { status: 404 });
}

/** Un défi n'a de sens qu'entre deux joueurs libres : une partie en cours ne s'interrompt pas. */
async function eitherInMatch(
  db: D1Database,
  firstPlayerId: string,
  secondPlayerId: string,
): Promise<boolean> {
  const [firstMatch, secondMatch] = await Promise.all([
    readCurrentMatch(db, firstPlayerId),
    readCurrentMatch(db, secondPlayerId),
  ]);
  return firstMatch !== undefined || secondMatch !== undefined;
}

function failure(code: string): Response {
  return Response.json({ code }, { status: statusFor(code) });
}

function statusFor(code: string): number {
  switch (code) {
    case "UNKNOWN_PLAYER":
    case "NOT_FOUND":
    case "NO_CHALLENGE":
      return 404;
    case "NOT_FRIENDS":
    case "BLOCKED":
    case "UNAVAILABLE":
    case "PRIVATE":
      return 403;
    case "ALREADY_FRIENDS":
    case "IN_MATCH":
      return 409;
    case "TOO_MANY_REQUESTS":
    case "RATE_LIMITED":
      return 429;
    default:
      return 400;
  }
}

/** Une relation supprimée retire aussi les invitations dans les deux sens. */
async function cancelChallengesBetween(env: Env, self: string, other: string): Promise<void> {
  await callSocial(env, self, "/challenge/cancel", { to: other }).catch(() => undefined);
  await callSocial(env, other, "/challenge/cancel", { to: self }).catch(() => undefined);
}

async function cancelChallenge(env: Env, from: string, to: string): Promise<Response> {
  const response = await callSocial(env, from, "/challenge/cancel", { to });
  const { cancelled } = (await response.json()) as { cancelled: boolean };
  return cancelled ? Response.json({ cancelled }) : failure("NO_CHALLENGE");
}
