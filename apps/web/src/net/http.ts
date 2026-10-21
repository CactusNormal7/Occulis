import type { Outcome } from "../load/cache.js";

/** Ce que le serveur joint à un refus : un code du projet, ou le message de Better Auth. */
export interface ErrorPayload {
  readonly code?: string;
  readonly message?: string;
}

/** Comment une famille d'appels met en mots ses échecs, dans la langue du joueur. */
export interface ErrorWording {
  readonly unreachable: () => string;
  readonly describe: (status: number, payload: ErrorPayload) => string;
}

/**
 * Un appel JSON qui ne rejette jamais : une coupure réseau ou un refus du serveur
 * deviennent un `Outcome` en échec, déjà mis en mots, que la vue affiche tel quel.
 * Chaque famille d'appels (back-office, profil, amis) n'y apporte que sa formulation.
 */
export async function request<T>(
  path: string,
  init: RequestInit | undefined,
  wording: ErrorWording,
): Promise<Outcome<T>> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    return { ok: false, message: wording.unreachable() };
  }
  const payload = (await response.json().catch(() => ({}))) as T & ErrorPayload;
  if (!response.ok) return { ok: false, message: wording.describe(response.status, payload) };
  return { ok: true, value: payload };
}

/** Les options d'un envoi JSON ; sans corps, aucun n'est joint. */
export function jsonInit(method: "POST" | "PUT" | "DELETE", body?: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? null : JSON.stringify(body),
  };
}
