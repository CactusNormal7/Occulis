import type { MeMatchDetail, MeMatchPage, MeProfile, MeSession } from "@occulis/protocol";
import { messages } from "../i18n/current.js";
import { authMessage, ROUTE_PATHS } from "../net/auth.js";
import type { Outcome } from "../admin/api.js";

export type { Outcome };

/**
 * Les appels de la page de profil. Deux familles, comme côté serveur :
 * - `/api/me/*`, les routes du projet — profil, pseudo, sessions, parties ;
 * - les routes de Better Auth pour le reste du compte — mot de passe, adresse, Google,
 *   suppression.
 *
 * Aucun appel ne porte d'identifiant de compte ou de joueur : c'est le cookie de session
 * qui désigne le compte, et le serveur borne chaque requête à lui.
 */

export const PAGE_SIZE = 20;

async function call<T>(path: string, init?: RequestInit): Promise<Outcome<T>> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    return { ok: false, message: messages().profile.unreachable };
  }
  const payload = (await response.json().catch(() => ({}))) as T & { code?: string; message?: string };
  if (!response.ok) {
    if (response.status === 401) return { ok: false, message: messages().profile.sessionExpired };
    return { ok: false, message: authMessage(response.status, payload) };
  }
  return { ok: true, value: payload };
}

const send = <T>(path: string, body: unknown): Promise<Outcome<T>> =>
  call<T>(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export const profile = () => call<MeProfile>("/api/me");
export const sessions = () => call<MeSession[]>("/api/me/sessions");
export const matches = (offset: number) => call<MeMatchPage>(`/api/me/matches?limit=${PAGE_SIZE}&offset=${offset}`);
export const match = (id: string) => call<MeMatchDetail>(`/api/me/matches/${encodeURIComponent(id)}`);

export const changeHandle = (handle: string) => send<{ handle: string }>("/api/me/handle", { handle });
export const revokeSession = (id: string) => send(`/api/me/sessions/${encodeURIComponent(id)}/revoke`, {});
export const revokeOtherSessions = () => send<{ revoked: number }>("/api/me/sessions/revoke-others", {});

/** Les autres sessions sont fermées par le serveur dans tous les cas (`hooks.before`). */
export const changePassword = (currentPassword: string, newPassword: string) =>
  send("/api/auth/change-password", { currentPassword, newPassword, revokeOtherSessions: true });

/**
 * Un compte créé par Google n'a pas de mot de passe. Il en obtient un par le lien de
 * réinitialisation, envoyé à son adresse : c'est la preuve qu'il la détient, ce que la
 * seule session ne prouve pas.
 */
export const requestPasswordSetup = (email: string) =>
  send("/api/auth/request-password-reset", { email, redirectTo: ROUTE_PATHS.reset });

/** Le lien part vers l'**ancienne** adresse ; rien ne change avant les deux confirmations. */
export const changeEmail = (newEmail: string) => send("/api/auth/change-email", { newEmail, callbackURL: "/profile/" });

export const resendVerification = (email: string) =>
  send("/api/auth/send-verification-email", { email, callbackURL: "/profile/" });

export const unlink = (providerId: string) => send("/api/auth/unlink-account", { providerId });

/** N'efface rien : envoie le lien de confirmation, seul à pouvoir supprimer le compte. */
export const requestDeletion = () => send("/api/auth/delete-user", { callbackURL: `${ROUTE_PATHS.signin}?deleted=1` });
