import type { MeProfile } from "@occulis/protocol";
import { availableProviders, isImpersonated, type Auth } from "../auth/better-auth.js";
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
} from "./queries.js";
import { readMyFeats, setShowcase } from "./feats.js";
import { createPreset, deletePreset, listPresets, setDefaultPreset, updatePreset } from "./presets.js";

/**
 * Les routes de la page de profil propres au projet, sous `/api/me/`. Le reste de la
 * gestion du compte — mot de passe, adresse, connexions Google, suppression — passe par
 * les routes de Better Auth, qui portent leur propre contrôle (`auth/better-auth.ts`).
 *
 * Trois gardes, posées ici à l'entrée et pour toutes les routes à la fois :
 * - **l'identité vient de la session** (le cookie), jamais d'un paramètre : aucune route
 *   ne prend d'identifiant de joueur ou de compte, et chaque requête SQL est bornée par
 *   celui de la session (`me/queries.ts`) ;
 * - **une écriture doit venir de la page elle-même** : `SameSite=Lax` retient déjà le
 *   cookie d'un POST intersite, l'origine est vérifiée en plus, comme pour l'admin ;
 * - **une session d'emprunt est en lecture seule** : l'administrateur qui usurpe voit le
 *   profil, mais ne change rien au compte de quelqu'un d'autre.
 */
export async function handleMe(auth: Auth, env: Env, request: Request, url: URL): Promise<Response | undefined> {
  if (url.pathname !== "/api/me" && !url.pathname.startsWith("/api/me/")) return undefined;

  const writing = request.method !== "GET";
  if (writing && request.headers.get("Origin") !== url.origin) {
    return new Response("origin refused", { status: 403 });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (session === null) return new Response("authentication required", { status: 401 });
  const { user } = session;
  const playerId = typeof user.playerId === "string" ? user.playerId : "";
  if (playerId.length === 0) return new Response("authentication required", { status: 401 });

  const impersonating = isImpersonated(session.session.impersonatedBy);
  if (writing && impersonating) {
    return Response.json({ code: "IMPERSONATION_READONLY" }, { status: 403 });
  }

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
        elo: row.elo,
      };
      return Response.json(profile);
    }
    if (path === "/sessions") return Response.json(await listSessions(env.DB, user.id, session.session.id, now));
    if (path === "/feats") return Response.json(await readMyFeats(env.DB, playerId));
    if (path === "/presets") return Response.json(await listPresets(env.DB, playerId));
    if (path === "/matches") return Response.json(await listMyMatches(env.DB, playerId, parsePage(url.searchParams)));

    const matchId = path.match(/^\/matches\/([\w-]+)$/)?.[1];
    if (matchId !== undefined) {
      const match = await readMyMatch(env.DB, playerId, matchId);
      if (match === "unknown") return new Response("not found", { status: 404 });
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
    if (path === "/showcase") {
      const result = await setShowcase(env.DB, playerId, await request.json().catch(() => ({})));
      return result.ok ? Response.json({ showcase: result.showcase }) : Response.json({ code: result.code }, { status: 400 });
    }
    if (path === "/presets") {
      const result = await createPreset(env.DB, playerId, await request.json().catch(() => ({})), now);
      return result.ok ? Response.json(result.preset) : Response.json({ code: result.code }, { status: presetStatus(result.code) });
    }
    const defaultId = path.match(/^\/presets\/([\w-]+)\/default$/)?.[1];
    if (defaultId !== undefined) {
      return (await setDefaultPreset(env.DB, playerId, defaultId))
        ? Response.json({ isDefault: true })
        : Response.json({ code: "PRESET_NOT_FOUND" }, { status: 404 });
    }
    if (path === "/sessions/revoke-others") {
      return Response.json({ revoked: await revokeOtherSessions(env.DB, user.id, session.session.id) });
    }
    const sessionId = path.match(/^\/sessions\/([\w-]+)\/revoke$/)?.[1];
    if (sessionId !== undefined) {
      const revoked = await revokeSession(env.DB, user.id, sessionId);
      return revoked ? Response.json({ revoked: 1 }) : new Response("not found", { status: 404 });
    }
  }

  const presetId = path.match(/^\/presets\/([\w-]+)$/)?.[1];
  if (presetId !== undefined && request.method === "PUT") {
    const result = await updatePreset(env.DB, playerId, presetId, await request.json().catch(() => ({})), now);
    return result.ok ? Response.json(result.preset) : Response.json({ code: result.code }, { status: presetStatus(result.code) });
  }
  if (presetId !== undefined && request.method === "DELETE") {
    return (await deletePreset(env.DB, playerId, presetId))
      ? Response.json({ deleted: 1 })
      : Response.json({ code: "PRESET_NOT_FOUND" }, { status: 404 });
  }

  return new Response("not found", { status: 404 });
}

function presetStatus(code: string): number {
  if (code === "PRESET_NOT_FOUND") return 404;
  if (code === "PRESET_LIMIT") return 409;
  return 400;
}

function statusFor(code: string): number {
  if (code === "HANDLE_TAKEN") return 422;
  if (code === "HANDLE_COOLDOWN") return 429;
  return 400;
}
