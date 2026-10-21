import type { Challenge, SocialServerMessage } from "@occulis/protocol";
import type { Auth } from "../auth/better-auth.js";
import { guardCaller } from "../auth/guard.js";
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
    const { playerId } = (await readBody(request)) as { playerId?: unknown };
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
    const { playerId } = (await readBody(request)) as { playerId?: unknown };
    if (typeof playerId !== "string" || playerId === self) return failure("UNKNOWN_PLAYER");
    if ((await handleOf(db, playerId)) === undefined) return failure("UNKNOWN_PLAYER");
    await block(db, self, playerId, now);
    // Le bloqué voit seulement disparaître une relation, sans savoir pourquoi.
    await callSocial(env, self, "/challenge/cancel", { to: playerId }).catch(() => undefined);
    await callSocial(env, playerId, "/challenge/cancel", { to: self }).catch(() => undefined);
    await pushTo(env, playerId, { kind: "friends-changed" });
    return Response.json({ relation: "blocked" });
  }

  const blocked = path.match(/^\/api\/blocks\/([\w-]+)$/)?.[1];
  if (method === "DELETE" && blocked !== undefined) {
    return (await unblock(db, self, blocked))
      ? Response.json({ relation: "none" })
      : failure("NOT_FOUND");
  }

  const request_ = path.match(/^\/api\/friends\/requests\/([\w-]+)\/(accept|decline|cancel)$/);
  if (method === "POST" && request_ !== null) {
    const [, other = "", verb] = request_;
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

  const friendPath = path.match(/^\/api\/friends\/([\w-]+)(\/.*)?$/);
  if (friendPath === null) return new Response("not found", { status: 404 });
  const friend = friendPath[1] ?? "";
  const rest = friendPath[2] ?? "";

  if (method === "DELETE" && rest === "") {
    if (!(await removeFriend(db, self, friend))) return failure("NOT_FOUND");
    await callSocial(env, self, "/challenge/cancel", { to: friend }).catch(() => undefined);
    await callSocial(env, friend, "/challenge/cancel", { to: self }).catch(() => undefined);
    await pushTo(env, friend, { kind: "friends-changed" });
    return Response.json({ relation: "none" });
  }

  // Tout ce qui suit ouvre les données d'un ami, ou s'adresse à lui : l'amitié d'abord.
  if (!(await isFriend(db, self, friend))) return failure("NOT_FRIENDS");

  if (method === "GET") {
    if (rest === "") {
      const profile = await readFriendProfile(db, self, friend);
      return profile === undefined ? failure("NOT_FRIENDS") : Response.json(profile);
    }
    if (rest === "/matches")
      return Response.json(await listMyMatches(db, friend, parsePage(url.searchParams)));
    const matchId = rest.match(/^\/matches\/([\w-]+)$/)?.[1];
    if (matchId !== undefined) {
      // Le replay **de son point de vue**, exactement celui qu'il voit lui-même.
      const match = await readMyMatch(db, friend, matchId);
      if (match === "unknown") return new Response("not found", { status: 404 });
      if (match === "ongoing") return Response.json({ code: "MATCH_ONGOING" }, { status: 409 });
      return Response.json(match);
    }
    if (rest === "/messages") {
      // La lecture seule de l'emprunt ne va pas jusqu'aux messages privés : ils restent
      // entre les deux amis, administrateur compris (décision du 2026-10-21).
      if (caller.impersonating) return failure("PRIVATE");
      const raw = Number.parseInt(url.searchParams.get("before") ?? "", 10);
      return Response.json(
        await listMessages(db, self, friend, Number.isFinite(raw) ? raw : Number.MAX_SAFE_INTEGER),
      );
    }
  }

  if (method === "POST") {
    if (rest === "/messages") {
      const { body } = (await readBody(request)) as { body?: unknown };
      const checked = checkMessage(body);
      if (!checked.ok) return failure(checked.code);
      const message = await insertMessage(db, self, friend, checked.body, now);
      if (message === undefined) return failure("RATE_LIMITED");
      const pushed: SocialServerMessage = { kind: "message", message };
      // Vers soi aussi : ses autres pages ouvertes affichent le même fil.
      await Promise.all([pushTo(env, friend, pushed), pushTo(env, self, pushed)]);
      return Response.json(message);
    }
    if (rest === "/messages/read")
      return Response.json({ read: await markRead(db, self, friend, now) });

    if (rest === "/challenge") {
      const target = await handleOf(db, friend);
      if (target === undefined) return failure("NOT_FRIENDS");
      if (await eitherInMatch(db, self, friend)) return failure("IN_MATCH");
      const challenge: Challenge = { from: me, to: target, createdAt: now };
      return callSocial(env, self, "/challenge", challenge);
    }
    if (rest === "/challenge/accept") {
      // Revérifié à l'acceptation : l'un des deux a pu entrer en partie entre-temps.
      if (await eitherInMatch(db, self, friend)) return failure("IN_MATCH");
      return callSocial(env, friend, "/challenge/accept", { to: self });
    }
    if (rest === "/challenge/decline") {
      const { cancelled } = (await (
        await callSocial(env, friend, "/challenge/cancel", { to: self })
      ).json()) as {
        cancelled: boolean;
      };
      return cancelled ? Response.json({ cancelled }) : failure("NO_CHALLENGE");
    }
  }

  if (method === "DELETE" && rest === "/challenge") {
    const { cancelled } = (await (
      await callSocial(env, self, "/challenge/cancel", { to: friend })
    ).json()) as {
      cancelled: boolean;
    };
    return cancelled ? Response.json({ cancelled }) : failure("NO_CHALLENGE");
  }

  return new Response("not found", { status: 404 });
}

/** Un défi n'a de sens qu'entre deux joueurs libres : une partie en cours ne s'interrompt pas. */
async function eitherInMatch(db: D1Database, a: string, b: string): Promise<boolean> {
  const [ofA, ofB] = await Promise.all([readCurrentMatch(db, a), readCurrentMatch(db, b)]);
  return ofA !== undefined || ofB !== undefined;
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
