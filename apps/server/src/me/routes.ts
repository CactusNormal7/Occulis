import type { MeProfile } from "@occulis/protocol";
import { availableProviders, type Auth } from "../auth/better-auth.js";
import { guardCaller } from "../auth/guard.js";
import { parsePage } from "../admin/paging.js";
import {
  changeHandle,
  listMyMatches,
  listSessions,
  nextHandleChange,
  readMyMatch,
  readProfileRow,
  revokeOtherSessions,
  revokeSession,
  setAllowSpectators,
} from "./queries.js";

/**
 * Les routes de la page de profil propres au projet, sous `/api/me/`. Le reste de la
 * gestion du compte — mot de passe, adresse, connexions Google, suppression — passe par
 * les routes de Better Auth, qui portent leur propre contrôle (`auth/better-auth.ts`).
 *
 * La garde d'entrée est `guardCaller` (`auth/guard.ts`) : identité tirée de la session,
 * origine vérifiée pour toute écriture, session d'emprunt en lecture seule. Aucune route
 * ne prend d'identifiant de joueur ou de compte, et chaque requête SQL est bornée par
 * celui de la session (`me/queries.ts`).
 */
export async function handleMe(auth: Auth, env: Env, request: Request, url: URL): Promise<Response | undefined> {
  if (url.pathname !== "/api/me" && !url.pathname.startsWith("/api/me/")) return undefined;

  const caller = await guardCaller(auth, request, url);
  if (caller instanceof Response) return caller;
  const { session, playerId, impersonating } = caller;
  const { user } = session;

  const path = url.pathname.slice("/api/me".length);
  const now = Date.now();

  if (request.method === "GET") {
    if (path === "" || path === "/") {
      const row = await readProfileRow(env.DB, user.id, playerId);
      const profile: MeProfile = {
        handle: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: row.createdAt,
        nextHandleChangeAt: nextHandleChange(row.handleChangedAt, now),
        hasPassword: row.hasPassword,
        providers: row.providers,
        availableProviders: availableProviders(env),
        impersonating,
        record: row.record,
        allowSpectators: row.allowSpectators,
      };
      return Response.json(profile);
    }
    if (path === "/sessions") return Response.json(await listSessions(env.DB, user.id, session.session.id, now));
    if (path === "/matches") return Response.json(await listMyMatches(env.DB, playerId, parsePage(url.searchParams)));

    const matchId = path.match(/^\/matches\/([\w-]+)$/)?.[1];
    if (matchId !== undefined) {
      const match = await readMyMatch(env.DB, playerId, matchId);
      if (match === "unknown") return new Response("introuvable", { status: 404 });
      // 409 et non 404 : la partie est bien la vôtre, elle n'est simplement pas finie.
      if (match === "ongoing") return Response.json({ code: "MATCH_ONGOING" }, { status: 409 });
      return Response.json(match);
    }
  }

  if (request.method === "POST") {
    if (path === "/handle") {
      const body = (await request.json().catch(() => ({}))) as { handle?: unknown };
      const result = await changeHandle(env.DB, playerId, body.handle, now);
      if (!result.ok) return Response.json({ code: result.code }, { status: statusFor(result.code) });
      return Response.json({ handle: result.handle, nextHandleChangeAt: result.nextHandleChangeAt });
    }
    if (path === "/spectators") {
      const body = (await request.json().catch(() => ({}))) as { allow?: unknown };
      if (typeof body.allow !== "boolean") return Response.json({ code: "INVALID" }, { status: 400 });
      await setAllowSpectators(env.DB, playerId, body.allow);
      return Response.json({ allowSpectators: body.allow });
    }
    if (path === "/sessions/revoke-others") {
      return Response.json({ revoked: await revokeOtherSessions(env.DB, user.id, session.session.id) });
    }
    const sessionId = path.match(/^\/sessions\/([\w-]+)\/revoke$/)?.[1];
    if (sessionId !== undefined) {
      const revoked = await revokeSession(env.DB, user.id, sessionId);
      return revoked ? Response.json({ revoked: 1 }) : new Response("introuvable", { status: 404 });
    }
  }

  return new Response("introuvable", { status: 404 });
}

function statusFor(code: string): number {
  if (code === "HANDLE_TAKEN") return 422;
  if (code === "HANDLE_COOLDOWN") return 429;
  return 400;
}
