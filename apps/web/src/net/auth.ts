/**
 * Appels d'authentification. Le jeton de session n'apparaît jamais ici : il vit dans
 * un cookie `HttpOnly`, que le navigateur joint seul et que ce code ne peut pas lire.
 * C'est voulu — un jeton lisible en JavaScript est un jeton exfiltrable.
 *
 * Les chemins sont ceux de Better Auth, qui porte l'authentification côté serveur.
 * Seul `/api/auth/me` appartient au projet : il ne rend que le pseudo et l'état de
 * vérification, là où `/api/auth/get-session` rendrait le compte entier.
 */
export interface Identity {
  readonly signedIn: boolean;
  readonly handle?: string;
  readonly emailVerified?: boolean;
}

export type AuthOutcome =
  | { readonly ok: true; readonly identity: Identity }
  | { readonly ok: false; readonly message: string };

export async function whoAmI(): Promise<Identity> {
  const response = await fetch("/api/auth/me");
  if (!response.ok) return { signedIn: false };
  return (await response.json()) as Identity;
}

export async function register(email: string, password: string, handle: string): Promise<AuthOutcome> {
  // Better Auth appelle `name` ce que le jeu appelle pseudo. La traduction s'arrête
  // ici : `players.handle` reste le nom du concept partout ailleurs.
  return submit("/api/auth/sign-up/email", { email, password, name: handle });
}

export async function signIn(email: string, password: string): Promise<AuthOutcome> {
  return submit("/api/auth/sign-in/email", { email, password });
}

export async function signOut(): Promise<void> {
  await fetch("/api/auth/sign-out", { method: "POST", headers: JSON_HEADERS, body: "{}" });
}

/**
 * Demande un message de réinitialisation. Répond `ok` même pour une adresse inconnue :
 * le serveur ne distingue pas les deux cas, et l'interface ne doit pas le faire non plus.
 */
export async function requestReset(email: string): Promise<AuthOutcome> {
  return submit("/api/auth/request-password-reset", { email, redirectTo: RESET_PATH });
}

export async function resetPassword(token: string, newPassword: string): Promise<AuthOutcome> {
  return submit("/api/auth/reset-password", { token, newPassword });
}

export async function resendVerification(email: string): Promise<AuthOutcome> {
  return submit("/api/auth/send-verification-email", { email, callbackURL: "/" });
}

/** Le lien du courrier de réinitialisation revient sur la page avec le jeton en clair. */
export const RESET_PATH = "/?reinitialiser=1";

/** Le jeton de réinitialisation porté par l'URL courante, s'il y en a un. */
export function resetTokenFrom(search: string): string | undefined {
  const parameters = new URLSearchParams(search);
  if (parameters.get("reinitialiser") !== "1") return undefined;
  const token = parameters.get("token");
  return token === null || token.length === 0 ? undefined : token;
}

/**
 * La traduction des refus. Elle s'accroche au **code** et jamais à la phrase : le
 * message d'une bibliothèque change sans prévenir, son code est un contrat.
 *
 * Fonction pure, donc éprouvable sans réseau — c'est la seule partie de ce module qui
 * décide quoi que ce soit.
 */
export function authMessage(status: number, payload: { code?: string; message?: string }): string {
  if (status === 429) return "Trop de tentatives. Réessayez dans une minute.";

  const known = MESSAGES[payload.code ?? ""];
  if (known !== undefined) return known;

  return payload.message ?? "Échec de la connexion.";
}

const MESSAGES: Record<string, string> = {
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Cette adresse est déjà utilisée.",
  HANDLE_TAKEN: "Ce pseudo est déjà pris.",
  HANDLE_LENGTH: "Le pseudo doit faire entre 2 et 32 caractères.",
  PASSWORD_TOO_SHORT: "Le mot de passe doit faire au moins 10 caractères.",
  VALIDATION_ERROR: "Adresse électronique invalide.",
  // Le serveur ne dit jamais lequel des deux est faux : le distinguer révélerait
  // quelles adresses sont inscrites.
  INVALID_EMAIL_OR_PASSWORD: "Identifiants invalides.",
  INVALID_TOKEN: "Ce lien a expiré. Demandez-en un nouveau.",
};

const JSON_HEADERS = { "Content-Type": "application/json" };

async function submit(path: string, body: unknown): Promise<AuthOutcome> {
  const response = await fetch(path, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    code?: string;
    message?: string;
  } & Identity;

  if (!response.ok) return { ok: false, message: authMessage(response.status, payload) };
  return { ok: true, identity: { signedIn: true } };
}
