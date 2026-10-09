/**
 * Hachage des mots de passe, par PBKDF2-HMAC-SHA256 via WebCrypto.
 *
 * Ni bcrypt ni argon2 ne sont disponibles dans un Worker sans embarquer du WASM ;
 * PBKDF2 est le seul dérivateur lent natif. C'est un compromis assumé : il résiste
 * moins bien qu'argon2 à une attaque par GPU, à coût CPU égal.
 *
 * Le paramétrage est **stocké dans l'empreinte**, ce qui permet de le durcir plus tard
 * sans invalider les mots de passe existants : une empreinte ancienne reste vérifiable,
 * et peut être réécrite à la prochaine connexion réussie.
 */

/**
 * Plafond **imposé par le runtime Workers** : au-delà, `deriveBits` lève
 * `NotSupportedError: Pbkdf2 failed: iteration counts above 100000 are not supported`.
 * La limite est codée en dur dans le runtime pour qu'un Worker ne puisse pas se servir
 * de PBKDF2 comme d'un déni de service (cloudflare/workerd#1346).
 *
 * **Le workerd local ne l'applique pas** : tests et `wrangler dev` acceptent n'importe
 * quel compte d'itérations, et laissent donc passer une valeur que la bordure refusera.
 * C'est exactement ce qui s'est produit — d'où le test de garde dans `password.test.ts`.
 */
const MAX_ITERATIONS_PER_PASS = 100_000;

/**
 * Le plafond ci-dessus est en dessous des 600 000 que l'OWASP recommande pour
 * PBKDF2-SHA256 depuis 2023. On les atteint donc en **enchaînant** les dérivations : la
 * sortie d'une passe sert d'entrée à la suivante, chaque appel restant sous la limite.
 * Le travail total qu'un attaquant doit refaire est bien la somme des passes, puisque
 * aucune ne peut être calculée avant la précédente.
 */
const ITERATIONS_PER_PASS = 100_000;
const PASSES = 6;

const KEY_BITS = 256;
const SALT_BYTES = 16;

export const MIN_PASSWORD_LENGTH = 10;

/** Exporté pour le test de garde, qui verrouille l'invariant que la bordure impose. */
export const PBKDF2_PARAMETERS = {
  maxIterationsPerPass: MAX_ITERATIONS_PER_PASS,
  iterationsPerPass: ITERATIONS_PER_PASS,
  passes: PASSES,
} as const;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const derived = await derive(password, salt, ITERATIONS_PER_PASS, PASSES);
  return `pbkdf2-sha256$${PASSES}x${ITERATIONS_PER_PASS}$${toBase64(salt)}$${toBase64(derived)}`;
}

/**
 * Vérifie un mot de passe. La comparaison est à temps constant : comparer octet par
 * octet avec sortie anticipée laisse fuiter, par la durée, le nombre d'octets corrects.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, cost, salt, expected] = stored.split("$");
  if (scheme !== "pbkdf2-sha256" || cost === undefined) return false;
  if (salt === undefined || expected === undefined) return false;

  const parameters = parseCost(cost);
  if (parameters === undefined) return false;

  const derived = await derive(password, fromBase64(salt), ...parameters);
  return timingSafeEquals(derived, fromBase64(expected));
}

/**
 * `6x100000` — six passes de cent mille — ou `210000`, la forme d'avant le chaînage,
 * lue comme une passe unique. Aucune empreinte de l'ancienne forme n'existe sur un
 * environnement déployé, l'authentification n'y ayant jamais abouti ; celles des bases
 * de développement local restent vérifiables, le workerd local n'ayant aucun plafond.
 */
function parseCost(cost: string): readonly [iterations: number, passes: number] | undefined {
  const [left, right] = cost.split("x");
  if (left === undefined) return undefined;

  const first = Number.parseInt(left, 10);
  if (!Number.isInteger(first) || first <= 0) return undefined;
  if (right === undefined) return [first, 1];

  const iterations = Number.parseInt(right, 10);
  if (!Number.isInteger(iterations) || iterations <= 0) return undefined;
  return [iterations, first];
}

async function derive(
  password: string,
  salt: Uint8Array,
  iterations: number,
  passes: number,
): Promise<Uint8Array> {
  // La première passe part du mot de passe, les suivantes de la sortie de la
  // précédente : le sel reste le même, c'est le chaînage qui porte le coût.
  let material = new TextEncoder().encode(password) as Uint8Array;
  for (let pass = 0; pass < passes; pass++) {
    material = await deriveOnce(material, salt, iterations);
  }
  return material;
}

async function deriveOnce(
  material: Uint8Array,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", material, "PBKDF2", false, ["deriveBits"]);
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

/**
 * Le mot de passe figure-t-il dans une fuite connue (Have I Been Pwned) ?
 *
 * Par k-anonymat : seuls les cinq premiers caractères de l'empreinte SHA-1 quittent le
 * Worker, et la réponse — quelques centaines de suffixes, complétés de leurres par
 * `Add-Padding` — est comparée ici. Le service n'apprend donc ni le mot de passe ni
 * s'il était dans la liste.
 *
 * Écrit ici plutôt que pris au greffon `haveIBeenPwned` de Better Auth, parce que
 * celui-ci **échoue fermé** : une panne du service rendrait toute inscription
 * impossible. Ici, une panne rend `undefined` et l'appelant laisse passer — la longueur
 * minimale et le hachage lent restent la vraie défense, la liste n'est qu'un filet.
 */
export async function breachedPassword(
  password: string,
  fetcher: typeof fetch = fetch,
): Promise<boolean | undefined> {
  try {
    const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(password));
    const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
    const response = await fetcher(`https://api.pwnedpasswords.com/range/${hex.slice(0, 5)}`, {
      headers: { "Add-Padding": "true", "User-Agent": "Occulis" },
      signal: AbortSignal.timeout(BREACH_TIMEOUT_MS),
    });
    if (!response.ok) return undefined;
    const suffix = `${hex.slice(5)}:`;
    for (const line of (await response.text()).split(/\r?\n/)) {
      // Les leurres d'`Add-Padding` portent un compte nul : ils ne comptent pas.
      if (line.toUpperCase().startsWith(suffix)) return Number(line.slice(suffix.length)) > 0;
    }
    return false;
  } catch {
    return undefined;
  }
}

const BREACH_TIMEOUT_MS = 2_000;
