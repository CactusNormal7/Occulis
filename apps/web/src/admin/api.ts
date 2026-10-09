import type {
  AdminMatchDetail,
  AdminMatchPage,
  AdminPlayer,
  AdminStats,
} from "@occulis/protocol";
import { messages } from "../i18n/current.js";
import { adminMessage, type MatchStatus } from "./model.js";

/**
 * Les appels du back-office. Deux familles, comme côté serveur :
 * - `/api/auth/admin/*`, le greffon Better Auth, pour tout ce qui touche au compte ;
 * - `/api/admin/*`, les routes du projet, pour les parties et le pseudo.
 *
 * Aucun appel ne porte d'identité : c'est le cookie de session qui la porte, et le
 * serveur revérifie le rôle à chacun.
 */

export type Outcome<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly message: string };

/** Un compte tel que le greffon le rend, réduit à ce que la page lit. */
export interface AdminUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly createdAt: string;
  readonly role?: string | null;
  readonly banned?: boolean | null;
  readonly banReason?: string | null;
  readonly banExpires?: string | null;
  readonly playerId?: string | null;
}

export interface AdminSession {
  readonly token: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly ipAddress?: string | null;
  readonly userAgent?: string | null;
}

export const PAGE_SIZE = 25;

async function call<T>(path: string, init?: RequestInit): Promise<Outcome<T>> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    return { ok: false, message: messages().admin.unreachable };
  }
  const payload = (await response.json().catch(() => ({}))) as T & { code?: string; message?: string };
  if (!response.ok) return { ok: false, message: adminMessage(response.status, payload) };
  return { ok: true, value: payload };
}

const send = <T>(path: string, body: unknown): Promise<Outcome<T>> =>
  call<T>(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

// --- Routes du projet ----------------------------------------------------------

export const stats = () => call<AdminStats>("/api/admin/stats");

export function matches(filter: {
  player?: string;
  status?: MatchStatus | null;
  offset: number;
  limit?: number;
}): Promise<Outcome<AdminMatchPage>> {
  const parameters = new URLSearchParams({ limit: String(filter.limit ?? PAGE_SIZE), offset: String(filter.offset) });
  if (filter.player !== undefined) parameters.set("player", filter.player);
  if (filter.status != null) parameters.set("status", filter.status);
  return call(`/api/admin/matches?${parameters}`);
}

export const match = (id: string) => call<AdminMatchDetail>(`/api/admin/matches/${encodeURIComponent(id)}`);
export const player = (id: string) => call<AdminPlayer>(`/api/admin/players/${encodeURIComponent(id)}`);
export const rename = (playerId: string, handle: string) =>
  send<{ handle: string }>(`/api/admin/players/${encodeURIComponent(playerId)}/handle`, { handle });

// --- Greffon Better Auth -------------------------------------------------------

export function users(search: string, offset: number): Promise<Outcome<{ users: AdminUser[]; total: number }>> {
  const parameters = new URLSearchParams({
    limit: String(PAGE_SIZE),
    offset: String(offset),
    sortBy: "createdAt",
    sortDirection: "desc",
  });
  const text = search.trim();
  if (text.length > 0) {
    // Une adresse se cherche par adresse, tout le reste par pseudo : le greffon ne
    // cherche que dans un champ à la fois.
    parameters.set("searchField", text.includes("@") ? "email" : "name");
    parameters.set("searchOperator", "contains");
    parameters.set("searchValue", text);
  }
  return call(`/api/auth/admin/list-users?${parameters}`);
}

export const user = (id: string) => call<AdminUser>(`/api/auth/admin/get-user?id=${encodeURIComponent(id)}`);
export const sessions = (userId: string) =>
  send<{ sessions: AdminSession[] }>("/api/auth/admin/list-user-sessions", { userId });
export const revokeSession = (sessionToken: string) => send("/api/auth/admin/revoke-user-session", { sessionToken });
export const revokeSessions = (userId: string) => send("/api/auth/admin/revoke-user-sessions", { userId });
export const setRole = (userId: string, role: string) => send("/api/auth/admin/set-role", { userId, role });
export const ban = (userId: string, banReason: string, banExpiresIn: number | undefined) =>
  send("/api/auth/admin/ban-user", {
    userId,
    ...(banReason.trim().length > 0 ? { banReason: banReason.trim() } : {}),
    ...(banExpiresIn !== undefined ? { banExpiresIn } : {}),
  });
export const unban = (userId: string) => send("/api/auth/admin/unban-user", { userId });
export const setPassword = (userId: string, newPassword: string) =>
  send("/api/auth/admin/set-user-password", { userId, newPassword });
export const update = (userId: string, data: { email?: string; emailVerified?: boolean }) =>
  send<AdminUser>("/api/auth/admin/update-user", { userId, data });
export const remove = (userId: string) => send("/api/auth/admin/remove-user", { userId });
export const create = (email: string, password: string, name: string, role: string) =>
  send<{ user: AdminUser }>("/api/auth/admin/create-user", { email, password, name, role });

/**
 * Ouvre une session au nom du joueur. Better Auth met celle de l'administrateur de côté
 * dans un cookie signé, et la rend à `stop-impersonating` (`net/auth.ts`).
 */
export const impersonate = (userId: string) => send("/api/auth/admin/impersonate-user", { userId });
