/**
 * Lecture des paramètres de liste du back-office. Pur, donc éprouvé sans base : c'est
 * la seule partie des routes d'administration qui décide quelque chose de la requête.
 */

export const DEFAULT_PAGE_SIZE = 25;

/** Un plafond : une page démesurée ferait lire toute la table à chaque appel. */
export const MAX_PAGE_SIZE = 100;

export interface Page {
  readonly limit: number;
  readonly offset: number;
}

export type MatchStatus = "ongoing" | "finished";

export interface MatchFilter extends Page {
  readonly player: string | null;
  readonly status: MatchStatus | null;
}

export function parsePage(parameters: URLSearchParams): Page {
  const limit = integer(parameters.get("limit"), DEFAULT_PAGE_SIZE);
  const offset = integer(parameters.get("offset"), 0);
  return { limit: Math.min(Math.max(limit, 1), MAX_PAGE_SIZE), offset: Math.max(offset, 0) };
}

export function parseMatchFilter(parameters: URLSearchParams): MatchFilter {
  const player = parameters.get("player");
  const status = parameters.get("status");
  return {
    ...parsePage(parameters),
    player: player === null || player.length === 0 ? null : player,
    status: status === "ongoing" || status === "finished" ? status : null,
  };
}

/** Les mêmes bornes que l'inscription (`auth/better-auth.ts`), qui crée le pseudo. */
export function validHandle(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const handle = raw.trim();
  return handle.length >= 2 && handle.length <= 32 ? handle : undefined;
}

function integer(raw: string | null, fallback: number): number {
  if (raw === null) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : fallback;
}
