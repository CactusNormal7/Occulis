/**
 * Les règles du pseudo, en un seul endroit : l'inscription, le changement par le joueur
 * (`/api/me/handle`) et le renommage par un administrateur passent tous par ici. Pur,
 * donc éprouvé sans base.
 *
 * Le pseudo est ce que l'adversaire voit de vous : les règles visent d'abord
 * l'usurpation visuelle, pas l'esthétique. D'où la normalisation NFKC (« ｊｕｌｅｓ »
 * pleine chasse devient « jules », donc entre en collision avec lui), le refus des
 * caractères invisibles et de direction (un U+202E retourne l'affichage du texte qui le
 * suit), et l'unicité insensible à la casse tenue par la base (migration 0006).
 */

export const MIN_HANDLE_LENGTH = 2;
export const MAX_HANDLE_LENGTH = 24;

export type HandleError = "HANDLE_LENGTH" | "HANDLE_CHARSET" | "HANDLE_RESERVED";

export type HandleCheck =
  | { readonly ok: true; readonly handle: string }
  | { readonly ok: false; readonly code: HandleError };

// Lettres et chiffres de toute écriture, quelques séparateurs, et les signes
// diacritiques combinants qu'exigent certaines écritures (devanagari…). Tout le reste —
// contrôles, formats (U+200B, U+202E), symboles, emoji — est refusé.
const ALLOWED = /^[\p{L}\p{M}\p{N}_.\- ]+$/u;
// Un empilement de diacritiques (« Zalgo ») déborde des lignes voisines à l'affichage.
const STACKED_MARKS = /\p{M}{2,}/u;

/**
 * Noms qu'un joueur ne peut pas prendre, parce qu'ils feraient croire à un message de
 * l'équipe. Comparés après réduction (casse, accents, séparateurs), donc « Mod-érateur »
 * tombe comme « moderateur ».
 */
const RESERVED = new Set([
  "admin",
  "administrateur",
  "administrator",
  "moderateur",
  "moderator",
  "modo",
  "occulis",
  "support",
  "staff",
  "equipe",
  "systeme",
  "system",
  "root",
  "officiel",
  "official",
]);

/**
 * Les préfixes des profils anonymisés à la suppression d'un compte (`anonymousHandle`).
 * `supprime` est l'ancien, d'avant le passage du nommage en anglais : des profils le
 * portent encore en base, il reste donc réservé.
 */
const DELETED_PREFIXES = ["deleted", "supprime"] as const;

export function normalizeHandle(raw: string): string {
  return raw.normalize("NFKC").trim().replace(/\s+/gu, " ");
}

export function checkHandle(raw: unknown): HandleCheck {
  if (typeof raw !== "string") return { ok: false, code: "HANDLE_LENGTH" };
  const handle = normalizeHandle(raw);
  const length = [...handle].length;
  if (length < MIN_HANDLE_LENGTH || length > MAX_HANDLE_LENGTH) return { ok: false, code: "HANDLE_LENGTH" };
  if (!ALLOWED.test(handle) || STACKED_MARKS.test(handle)) return { ok: false, code: "HANDLE_CHARSET" };
  const folded = fold(handle);
  if (RESERVED.has(folded) || DELETED_PREFIXES.some((prefix) => folded.startsWith(prefix))) return { ok: false, code: "HANDLE_RESERVED" };
  return { ok: true, handle };
}

/** Casse, accents et séparateurs retirés : la forme sous laquelle on compare aux noms réservés. */
function fold(handle: string): string {
  return handle
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[\s_.\-]/gu, "");
}

const FALLBACK_BASE = "player";
/** Place laissée au suffixe de désambiguïsation, pour que le pseudo final tienne. */
const SUFFIX_ROOM = 5;
const NUMBERED_ATTEMPTS = 8;

/**
 * Les pseudos à essayer, dans l'ordre, pour un compte créé par un fournisseur d'identité
 * (Google) : son nom affiché, nettoyé, puis numéroté, puis suffixé d'aléa.
 *
 * Un compte Google n'a pas de pseudo Occulis et l'inscription ne doit pas échouer pour
 * autant : le joueur le changera depuis son profil s'il ne lui convient pas. `random`
 * est fourni par l'appelant, ce qui garde la fonction testable.
 */
export function handleCandidates(displayName: string, random: () => string): string[] {
  const base = handleBase(displayName);
  const candidates = [base];
  for (let n = 2; n < 2 + NUMBERED_ATTEMPTS; n += 1) candidates.push(`${base}-${n}`);
  candidates.push(`${base}-${random()}`, `${base}-${random()}`);
  return candidates.filter((candidate) => checkHandle(candidate).ok);
}

function handleBase(displayName: string): string {
  const cleaned = [...normalizeHandle(displayName).replace(/[^\p{L}\p{M}\p{N}_.\- ]/gu, "").replace(/\p{M}{2,}/gu, "")]
    .slice(0, MAX_HANDLE_LENGTH - SUFFIX_ROOM)
    .join("")
    .trim();
  return checkHandle(cleaned).ok ? cleaned : FALLBACK_BASE;
}

/**
 * Le pseudo d'un profil dont le compte a été supprimé. Le profil survit — les logs de
 * parties le référencent et doivent rester rejouables — mais plus rien ne doit y
 * rattacher la personne. Le préfixe est réservé (`checkHandle`), donc personne ne peut
 * se faire passer pour un compte supprimé.
 */
export function anonymousHandle(playerId: string): string {
  return `deleted-${playerId.replace(/-/g, "").slice(0, 12)}`;
}
