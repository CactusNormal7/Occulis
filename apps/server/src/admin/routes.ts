import { isAdmin, type Auth } from "../auth/better-auth.js";
import { checkHandle } from "../auth/handle.js";
import { parseMatchFilter } from "./paging.js";
import { listMatches, readMatch, readPlayer, readStats, renamePlayer } from "./queries.js";

/**
 * Les routes du back-office propres au projet, sous `/api/admin/`.
 *
 * Elles ne couvrent que ce que Better Auth ignore — les parties, les profils de jeu et
 * le pseudo, qui vit dans les deux mondes. Tout ce qui touche au compte lui-même (rôle,
 * bannissement, mot de passe, sessions, suppression) passe par les routes du greffon,
 * sous `/api/auth/admin/`, qui portent leur propre contrôle de rôle.
 *
 * Le contrôle d'accès est fait ici, à l'entrée, une fois pour toutes les routes : le
 * rôle vient de la session résolue depuis le cookie, jamais d'un paramètre.
 */
export async function handleAdmin(
  auth: Auth,
  env: Env,
  request: Request,
  url: URL,
): Promise<Response | undefined> {
  if (!url.pathname.startsWith("/api/admin/")) return undefined;

  const denied = await refuseNonAdmin(auth, request, url);
  if (denied !== undefined) return denied;

  const path = url.pathname.slice("/api/admin".length);

  if (request.method === "GET") {
    if (path === "/stats") return Response.json(await readStats(env.DB, Date.now()));
    if (path === "/matches") return Response.json(await listMatches(env.DB, parseMatchFilter(url.searchParams)));

    const matchId = path.match(/^\/matches\/([\w-]+)$/)?.[1];
    if (matchId !== undefined) return found(await readMatch(env.DB, matchId));

    const playerId = path.match(/^\/players\/([\w-]+)$/)?.[1];
    if (playerId !== undefined) return found(await readPlayer(env.DB, playerId));
  }

  if (request.method === "POST") {
    const playerId = path.match(/^\/players\/([\w-]+)\/handle$/)?.[1];
    if (playerId !== undefined) return rename(env, request, playerId);
  }

  return new Response("introuvable", { status: 404 });
}

async function refuseNonAdmin(auth: Auth, request: Request, url: URL): Promise<Response | undefined> {
  // Une écriture doit venir de la page elle-même. `SameSite=Lax` retient déjà le cookie
  // d'un POST intersite ; l'origine est vérifiée en plus, comme Better Auth le fait
  // pour ses propres routes.
  if (request.method !== "GET" && request.headers.get("Origin") !== url.origin) {
    return new Response("origine refusée", { status: 403 });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (session === null) return new Response("authentification requise", { status: 401 });
  if (!isAdmin(session.user.role)) return new Response("réservé aux administrateurs", { status: 403 });
  return undefined;
}

async function rename(env: Env, request: Request, playerId: string): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as { handle?: unknown };
  const checked = checkHandle(body.handle);
  if (!checked.ok) return Response.json({ code: checked.code }, { status: 400 });
  const handle = checked.handle;

  const result = await renamePlayer(env.DB, playerId, handle, Date.now());
  if (result === "unknown-player") return new Response("introuvable", { status: 404 });
  if (result === "handle-taken") return Response.json({ code: "HANDLE_TAKEN" }, { status: 422 });
  return Response.json({ handle });
}

function found(value: unknown): Response {
  return value === undefined ? new Response("introuvable", { status: 404 }) : Response.json(value);
}
