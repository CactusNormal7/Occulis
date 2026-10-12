import { isImpersonated, type Auth } from "./better-auth.js";

/**
 * La garde commune des routes d'un joueur sur lui-même (`/api/me/*`) et sur ses
 * relations (`/api/friends/*`…), posée à l'entrée et pour toutes les routes à la fois :
 * - **l'identité vient de la session** (le cookie), jamais d'un paramètre ;
 * - **une écriture doit venir de la page elle-même** : `SameSite=Lax` retient déjà le
 *   cookie d'un POST intersite, l'origine est vérifiée en plus, comme pour l'admin ;
 * - **une session d'emprunt est en lecture seule** : l'administrateur qui usurpe voit,
 *   mais ne change rien au compte de quelqu'un d'autre ni à ses relations.
 */
export interface Caller {
  readonly session: NonNullable<Awaited<ReturnType<Auth["api"]["getSession"]>>>;
  readonly playerId: string;
  readonly impersonating: boolean;
}

export async function guardCaller(auth: Auth, request: Request, url: URL): Promise<Caller | Response> {
  const writing = request.method !== "GET";
  if (writing && request.headers.get("Origin") !== url.origin) {
    return new Response("origin refused", { status: 403 });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (session === null) return new Response("authentication required", { status: 401 });
  const playerId = typeof session.user.playerId === "string" ? session.user.playerId : "";
  if (playerId.length === 0) return new Response("authentication required", { status: 401 });

  const impersonating = isImpersonated(session.session.impersonatedBy);
  if (writing && impersonating) {
    return Response.json({ code: "IMPERSONATION_READONLY" }, { status: 403 });
  }
  return { session, playerId, impersonating };
}
