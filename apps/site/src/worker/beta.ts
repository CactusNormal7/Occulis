/**
 * L'inscription à la beta, sans dépendance à Cloudflare : le stockage, l'envoi et la
 * limite de débit sont passés en paramètre (`BetaDeps`). `index.ts` les branche sur D1,
 * Resend et le limiteur de Workers ; les tests, sur des doubles en mémoire.
 *
 * Double opt-in (docs/technical/site.md) : une adresse entre « en attente » avec un jeton
 * de confirmation, dont seule l'empreinte est gardée ; elle ne devient « confirmée » que
 * par le lien reçu. Une attente non confirmée est purgée au bout de sept jours. La
 * désinscription efface la ligne.
 */

export const PENDING_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Un envoi plus rapide que ça après l'affichage du formulaire n'est pas humain. */
export const MIN_FILL_MS = 2500;
const MAX_EMAIL_LENGTH = 254;
// Volontairement permissive : la vraie vérification, c'est le lien de confirmation.
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export type SignupCode = "sent" | "invalid-email" | "consent-required" | "too-many" | "failed";

export interface Signup {
  readonly id: string;
  readonly email: string;
  readonly status: "pending" | "confirmed";
  readonly createdAt: number;
}

export interface BetaStore {
  find(email: string): Promise<Signup | undefined>;
  /** Crée l'attente, ou la renouvelle (nouveau jeton, nouvelle date) si elle existe. */
  savePending(signup: Signup, tokenHash: string, consentText: string): Promise<void>;
  /** Confirme l'attente qui porte ce jeton, si elle a moins de `PENDING_TTL_MS`. */
  confirm(tokenHash: string, now: number): Promise<Signup | undefined>;
  remove(id: string): Promise<boolean>;
  purgePending(before: number): Promise<number>;
}

export interface ConfirmationMail {
  readonly to: string;
  readonly confirmUrl: string;
  readonly unsubscribeUrl: string;
}

export interface BetaDeps {
  readonly store: BetaStore;
  readonly sendConfirmation: (mail: ConfirmationMail) => Promise<void>;
  /** `false` quand la connexion a dépassé sa limite d'envois. */
  readonly withinLimit: () => Promise<boolean>;
  readonly now: () => number;
  readonly siteUrl: string;
  /** Le secret qui signe les liens de désinscription. */
  readonly secret: string;
  readonly consentText: string;
}

export interface SignupInput {
  readonly email: string;
  readonly consent: string;
  /** Le champ piège, invisible : rempli, c'est un robot. */
  readonly website: string;
  /** L'heure d'affichage du formulaire, posée par la page ; vide sans JavaScript. */
  readonly shown: string;
}

export function normalizeEmail(raw: string): string | undefined {
  const email = raw.trim().toLowerCase();
  return email.length <= MAX_EMAIL_LENGTH && EMAIL.test(email) ? email : undefined;
}

const encoder = new TextEncoder();

function base64url(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of view) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomToken(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function hashToken(token: string): Promise<string> {
  return base64url(await crypto.subtle.digest("SHA-256", encoder.encode(token)));
}

async function sign(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return base64url(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

/**
 * Le jeton de désinscription : l'identifiant de la ligne, signé. Il n'est stocké nulle
 * part, et reste valable tant que la ligne existe — un message ancien désinscrit encore.
 */
export async function unsubscribeToken(secret: string, id: string): Promise<string> {
  return `${id}.${await sign(secret, `unsubscribe:${id}`)}`;
}

export async function verifyUnsubscribeToken(
  secret: string,
  token: string,
): Promise<string | undefined> {
  const [id, signature, extra] = token.split(".");
  if (id === undefined || signature === undefined || extra !== undefined || id === "")
    return undefined;
  const expected = await sign(secret, `unsubscribe:${id}`);
  // Comparaison en temps constant : la longueur est fixe, on ne s'arrête pas au premier écart.
  if (expected.length !== signature.length) return undefined;
  let difference = 0;
  for (let i = 0; i < expected.length; i += 1)
    difference |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return difference === 0 ? id : undefined;
}

export async function signup(input: SignupInput, deps: BetaDeps): Promise<SignupCode> {
  const now = deps.now();
  // Un robot reçoit la même réponse qu'une personne : rien ne lui apprend qu'il est repéré.
  const shown = Number(input.shown);
  if (
    input.website !== "" ||
    (input.shown !== "" && Number.isFinite(shown) && now - shown < MIN_FILL_MS)
  ) {
    return "sent";
  }
  const email = normalizeEmail(input.email);
  if (email === undefined) return "invalid-email";
  if (input.consent !== "yes") return "consent-required";
  if (!(await deps.withinLimit())) return "too-many";

  try {
    const existing = await deps.store.find(email);
    // Déjà confirmée : même réponse, aucun message — l'inscription d'un tiers ne se devine pas.
    if (existing?.status === "confirmed") return "sent";
    const id = existing?.id ?? crypto.randomUUID();
    const token = randomToken();
    await deps.store.savePending(
      { id, email, status: "pending", createdAt: now },
      await hashToken(token),
      deps.consentText,
    );
    await deps.sendConfirmation({
      to: email,
      confirmUrl: `${deps.siteUrl}/api/beta/confirm?token=${encodeURIComponent(token)}`,
      unsubscribeUrl: `${deps.siteUrl}/api/beta/unsubscribe?token=${encodeURIComponent(
        await unsubscribeToken(deps.secret, id),
      )}`,
    });
    return "sent";
  } catch (error) {
    console.error("beta signup failed", error);
    return "failed";
  }
}

export async function confirm(
  token: string,
  deps: Pick<BetaDeps, "store" | "now">,
): Promise<boolean> {
  if (token === "") return false;
  return (await deps.store.confirm(await hashToken(token), deps.now())) !== undefined;
}

export async function unsubscribe(
  token: string,
  deps: Pick<BetaDeps, "store" | "secret">,
): Promise<boolean> {
  const id = await verifyUnsubscribeToken(deps.secret, token);
  if (id === undefined) return false;
  // Un second clic sur le même lien trouve la ligne déjà effacée : c'est toujours un succès.
  await deps.store.remove(id);
  return true;
}
