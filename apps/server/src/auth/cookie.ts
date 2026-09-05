/**
 * Le cookie de session. Module pur : ni D1, ni WebCrypto.
 *
 * `HttpOnly` interdit à JavaScript de lire le jeton, `Secure` interdit de l'envoyer en
 * clair, `SameSite=Lax` empêche qu'un site tiers déclenche une requête authentifiée.
 * Aucun des trois n'est optionnel : le jeton vaut un mot de passe pendant sa durée de
 * vie.
 */
export const SESSION_COOKIE = "occulis_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function readCookie(header: string | null, name: string): string | undefined {
  if (header === null) return undefined;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() !== name) continue;
    return decodeURIComponent(part.slice(separator + 1).trim());
  }
  return undefined;
}

export function sessionCookie(token: string, maxAgeMs: number = SESSION_TTL_MS): string {
  const attributes = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${Math.floor(maxAgeMs / 1000)}`,
  ];
  return attributes.join("; ");
}

/** Un `Max-Age` nul demande au navigateur d'oublier le cookie immédiatement. */
export function clearedCookie(): string {
  return sessionCookie("", 0);
}
