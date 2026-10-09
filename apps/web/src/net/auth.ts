/**
 * Appels d'authentification. Le jeton de session n'apparaît jamais ici : il vit dans
 * un cookie `HttpOnly`, que le navigateur joint seul et que ce code ne peut pas lire.
 * C'est voulu — un jeton lisible en JavaScript est un jeton exfiltrable.
 *
 * Les chemins sont ceux de Better Auth, qui porte l'authentification côté serveur.
 * Seul `/api/auth/me` appartient au projet : il ne rend que le pseudo, l'adresse, l'état
 * de vérification et le rôle, là où `/api/auth/get-session` rendrait le compte entier.
 */
export interface Identity {
  readonly signedIn: boolean;
  readonly handle?: string;
  readonly email?: string;
  readonly emailVerified?: boolean;
  /** Montre le lien du back-office. Le serveur revérifie le rôle à chaque appel. */
  readonly admin?: boolean;
  /** Session ouverte par un administrateur au nom du joueur (back-office). */
  readonly impersonating?: boolean;
  /** Les fournisseurs d'identité que le serveur sait proposer (`google`). */
  readonly providers?: readonly string[];
}

export type AuthOutcome =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string; readonly code?: string | undefined };

export async function whoAmI(): Promise<Identity> {
  try {
    const response = await fetch("/api/auth/me");
    if (!response.ok) return { signedIn: false };
    return (await response.json()) as Identity;
  } catch {
    return { signedIn: false };
  }
}

export async function register(email: string, password: string, handle: string): Promise<AuthOutcome> {
  // Better Auth appelle `name` ce que le jeu appelle pseudo. La traduction s'arrête
  // ici : `players.handle` reste le nom du concept partout ailleurs.
  return submit("/api/auth/sign-up/email", { email, password, name: handle, callbackURL: VERIFIED_PATH });
}

export async function signIn(email: string, password: string): Promise<AuthOutcome> {
  return submit("/api/auth/sign-in/email", { email, password });
}

/**
 * Part chez Google. Le serveur rend l'adresse de consentement, qu'on ouvre dans la page
 * même : une fenêtre surgissante serait bloquée, et le retour se fait de toute façon par
 * redirection. Un compte créé par ce chemin arrive sur son profil, où il peut changer le
 * pseudo dérivé de son nom Google.
 */
export async function signInWithGoogle(): Promise<AuthOutcome> {
  return redirectTo("/api/auth/sign-in/social", {
    provider: "google",
    callbackURL: "/",
    newUserCallbackURL: "/profil/?bienvenue=1",
    errorCallbackURL: ROUTE_PATHS.signin,
  });
}

/** Rattache Google au compte de la session, depuis le profil. */
export async function linkGoogle(): Promise<AuthOutcome> {
  return redirectTo("/api/auth/link-social", {
    provider: "google",
    callbackURL: "/profil/?lie=google#securite",
    errorCallbackURL: "/profil/#securite",
  });
}

export async function signOut(): Promise<void> {
  await fetch("/api/auth/sign-out", { method: "POST", headers: JSON_HEADERS, body: "{}" });
}

/** Rend à l'administrateur sa propre session, après une usurpation. */
export async function stopImpersonating(): Promise<boolean> {
  const response = await fetch("/api/auth/admin/stop-impersonating", {
    method: "POST",
    headers: JSON_HEADERS,
    body: "{}",
  });
  return response.ok;
}

/**
 * Demande un message de réinitialisation. Répond `ok` même pour une adresse inconnue :
 * le serveur ne distingue pas les deux cas, et l'interface ne doit pas le faire non plus.
 */
export async function requestReset(email: string): Promise<AuthOutcome> {
  return submit("/api/auth/request-password-reset", { email, redirectTo: ROUTE_PATHS.reset });
}

export async function resetPassword(token: string, newPassword: string): Promise<AuthOutcome> {
  return submit("/api/auth/reset-password", { token, newPassword });
}

export async function resendVerification(email: string): Promise<AuthOutcome> {
  return submit("/api/auth/send-verification-email", { email, callbackURL: VERIFIED_PATH });
}

/**
 * Chaque parcours de compte a son URL : c'est à elle, autant qu'aux champs, que les
 * gestionnaires de mots de passe reconnaissent une connexion d'une inscription. Le
 * Worker sert la page du jeu sur chacune (`ACCOUNT_PATHS`, `apps/server/src/index.ts`).
 */
export const ROUTE_PATHS = {
  signin: "/connexion",
  register: "/inscription",
  forgot: "/mot-de-passe-oublie",
  reset: "/reinitialiser",
} as const;

/** Où ramène le lien de vérification d'adresse, une fois l'adresse confirmée. */
export const VERIFIED_PATH = "/?verifiee=1";

/**
 * La traduction des refus. Elle s'accroche au **code** et jamais à la phrase : le
 * message d'une bibliothèque change sans prévenir, son code est un contrat.
 *
 * Fonction pure, donc éprouvable sans réseau — c'est la seule partie de ce module qui
 * décide quoi que ce soit.
 */
export function authMessage(status: number, payload: { code?: string | undefined; message?: string | undefined }): string {
  if (status === 429 && payload.code !== "HANDLE_COOLDOWN") return "Trop de tentatives. Réessayez dans quelques minutes.";

  const known = MESSAGES[payload.code ?? ""];
  if (known !== undefined) return known;

  return payload.message ?? "La demande a échoué.";
}

const MESSAGES: Record<string, string> = {
  USER_ALREADY_EXISTS: "Cette adresse est déjà utilisée.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Cette adresse est déjà utilisée.",
  HANDLE_TAKEN: "Ce pseudo est déjà pris.",
  HANDLE_LENGTH: "Le pseudo doit faire entre 2 et 24 caractères.",
  HANDLE_CHARSET: "Lettres, chiffres, espaces, points, tirets et soulignés seulement.",
  HANDLE_RESERVED: "Ce pseudo est réservé.",
  HANDLE_UNCHANGED: "C'est déjà votre pseudo.",
  HANDLE_COOLDOWN: "Le pseudo ne se change qu'une fois par mois.",
  PASSWORD_TOO_SHORT: "Le mot de passe doit faire au moins 10 caractères.",
  PASSWORD_TOO_LONG: "Le mot de passe doit faire au plus 128 caractères.",
  PASSWORD_COMPROMISED:
    "Ce mot de passe figure dans des fuites de données connues. Choisissez-en un autre, de préférence généré.",
  INVALID_PASSWORD: "Mot de passe actuel incorrect.",
  CREDENTIAL_ACCOUNT_NOT_FOUND: "Ce compte n'a pas encore de mot de passe.",
  VALIDATION_ERROR: "Adresse électronique invalide.",
  INVALID_EMAIL: "Adresse électronique invalide.",
  // Le serveur ne dit jamais lequel des deux est faux : le distinguer révélerait
  // quelles adresses sont inscrites.
  INVALID_EMAIL_OR_PASSWORD: "Adresse ou mot de passe incorrect.",
  INVALID_TOKEN: "Ce lien n'est plus valable. Demandez-en un nouveau.",
  TOKEN_EXPIRED: "Ce lien a expiré. Demandez-en un nouveau.",
  BANNED_USER: "Ce compte est suspendu.",
  SESSION_EXPIRED: "Votre session est trop ancienne pour cette opération. Reconnectez-vous.",
  SESSION_NOT_FRESH: "Votre session est trop ancienne pour cette opération. Reconnectez-vous.",
  IMPERSONATION_READONLY: "Session d'emprunt : le compte de ce joueur ne peut pas être modifié.",
  FAILED_TO_UNLINK_LAST_ACCOUNT: "Impossible de retirer votre seule méthode de connexion.",
  EMAIL_NOT_VERIFIED: "Confirmez d'abord votre adresse.",
};

/**
 * Les retours d'une redirection (vérification d'adresse, Google, réinitialisation) : le
 * serveur ne peut parler qu'en paramètre d'URL, `?error=…`. Better Auth y met des codes
 * en majuscules pour ses propres liens, en minuscules pour l'OAuth.
 */
export function redirectMessage(error: string): string {
  return REDIRECT_MESSAGES[error] ?? MESSAGES[error] ?? "La connexion n'a pas abouti. Réessayez.";
}

const REDIRECT_MESSAGES: Record<string, string> = {
  // La liaison automatique exige une adresse déjà confirmée côté Occulis
  // (`requireLocalEmailVerified`) : sans elle, inscrire votre adresse suffirait à
  // capter votre futur compte Google.
  account_not_linked:
    "Un compte existe déjà avec cette adresse, mais elle n'a jamais été confirmée. Connectez-vous avec votre mot de passe, confirmez l'adresse, puis Google pourra y être lié.",
  "email_doesn't_match": "Ce compte Google n'utilise pas la même adresse que votre compte Occulis.",
  access_denied: "Connexion Google annulée.",
  state_mismatch: "La connexion a expiré en route. Réessayez.",
  please_restart_the_process: "La connexion a expiré en route. Réessayez.",
  unable_to_link_account: "Ce compte Google est déjà lié à un autre compte.",
  "account_already_linked_to_different_user": "Ce compte Google est déjà lié à un autre compte.",
  email_not_found: "Google n'a pas transmis d'adresse électronique.",
};

const JSON_HEADERS = { "Content-Type": "application/json" };

async function post(path: string, body: unknown): Promise<{ response: Response; payload: Record<string, unknown> } | undefined> {
  try {
    const response = await fetch(path, { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(body) });
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    return { response, payload };
  } catch {
    return undefined;
  }
}

async function submit(path: string, body: unknown): Promise<AuthOutcome> {
  const result = await post(path, body);
  if (result === undefined) return { ok: false, message: "Serveur injoignable. Vérifiez votre connexion." };
  if (result.response.ok) return { ok: true };
  return failure(result.response.status, result.payload);
}

async function redirectTo(path: string, body: unknown): Promise<AuthOutcome> {
  const result = await post(path, body);
  if (result === undefined) return { ok: false, message: "Serveur injoignable. Vérifiez votre connexion." };
  if (!result.response.ok) return failure(result.response.status, result.payload);
  const url = result.payload["url"];
  if (typeof url !== "string") return { ok: false, message: "La connexion n'a pas abouti. Réessayez." };
  location.assign(url);
  return { ok: true };
}

function failure(status: number, payload: Record<string, unknown>): AuthOutcome {
  const code = typeof payload["code"] === "string" ? payload["code"] : undefined;
  const message = typeof payload["message"] === "string" ? payload["message"] : undefined;
  return { ok: false, message: authMessage(status, { code, message }), code };
}
