/**
 * Hachage des mots de passe, par PBKDF2-HMAC-SHA256 via WebCrypto.
 *
 * Ni bcrypt ni argon2 ne sont disponibles dans un Worker sans embarquer du WASM ;
 * PBKDF2 est le seul dérivateur lent natif. C'est un compromis assumé : il résiste
 * moins bien qu'argon2 à une attaque par GPU, à coût CPU égal.
 *
 * Le nombre d'itérations est **stocké dans l'empreinte**, ce qui permet de l'augmenter
 * plus tard sans invalider les mots de passe existants : une empreinte ancienne reste
 * vérifiable, et peut être réécrite à la prochaine connexion réussie.
 */
const ITERATIONS = 210_000;
const KEY_BITS = 256;
const SALT_BYTES = 16;

export const MIN_PASSWORD_LENGTH = 10;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const derived = await derive(password, salt, ITERATIONS);
  return `pbkdf2-sha256$${ITERATIONS}$${toBase64(salt)}$${toBase64(derived)}`;
}

/**
 * Vérifie un mot de passe. La comparaison est à temps constant : comparer octet par
 * octet avec sortie anticipée laisse fuiter, par la durée, le nombre d'octets corrects.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterations, salt, expected] = stored.split("$");
  if (scheme !== "pbkdf2-sha256" || iterations === undefined) return false;
  if (salt === undefined || expected === undefined) return false;

  const rounds = Number.parseInt(iterations, 10);
  if (!Number.isInteger(rounds) || rounds <= 0) return false;

  const derived = await derive(password, fromBase64(salt), rounds);
  return timingSafeEquals(derived, fromBase64(expected));
}

/** Le jeton de session lui-même : 256 bits d'aléa, jamais dérivés d'autre chose. */
export function newSessionToken(): string {
  return toBase64(crypto.getRandomValues(new Uint8Array(32)));
}

/** Ce qu'on range en base : seule l'empreinte du jeton, pas le jeton. */
export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return toBase64(new Uint8Array(digest));
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    KEY_BITS,
  );
  return new Uint8Array(bits);
}

function timingSafeEquals(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index++) difference |= (a[index] ?? 0) ^ (b[index] ?? 0);
  return difference === 0;
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
