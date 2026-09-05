import { type Account, accountFor, authenticate, closeSession, openSession, register } from "./accounts.js";
import { SESSION_COOKIE, clearedCookie, readCookie, sessionCookie } from "./cookie.js";
import { MIN_PASSWORD_LENGTH } from "./password.js";

/**
 * Les routes d'authentification. Elles n'exposent jamais l'identifiant interne d'un
 * compte : le client n'a besoin que du pseudo affiché.
 *
 * PAS ENCORE FAIT, et à savoir avant toute mise en ligne publique : aucune limitation
 * de débit sur `/login`, donc rien n'empêche une attaque par force brute autrement que
 * par le coût du PBKDF2 ; aucune vérification d'adresse ; aucune réinitialisation de
 * mot de passe.
 */
export interface Credentials {
  readonly email?: unknown;
  readonly password?: unknown;
  readonly handle?: unknown;
}

export function currentToken(request: Request): string | undefined {
  return readCookie(request.headers.get("Cookie"), SESSION_COOKIE);
}

export async function currentAccount(env: Env, request: Request): Promise<Account | undefined> {
  return accountFor(env, currentToken(request), Date.now());
}

export async function handleAuth(request: Request, env: Env, path: string): Promise<Response | undefined> {
  if (path === "/api/auth/me") return describeMe(env, request);
  if (request.method !== "POST") return undefined;
  if (path === "/api/auth/register") return handleRegister(request, env);
  if (path === "/api/auth/login") return handleLogin(request, env);
  if (path === "/api/auth/logout") return handleLogout(request, env);
  return undefined;
}

async function describeMe(env: Env, request: Request): Promise<Response> {
  const account = await currentAccount(env, request);
  if (account === undefined) return Response.json({ signedIn: false });
  return Response.json({ signedIn: true, handle: account.handle });
}

async function handleRegister(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as Credentials;
  const email = asText(body.email);
  const password = asText(body.password);
  const handle = asText(body.handle);

  if (email === undefined || password === undefined || handle === undefined) {
    return problem(400, "Adresse, mot de passe et pseudo sont requis.");
  }
  if (handle.length < 2 || handle.length > 32) {
    return problem(400, "Le pseudo doit faire entre 2 et 32 caractères.");
  }

  const created = await register(env, email, password, handle, Date.now());
  if (typeof created === "string") return problem(409, REGISTRATION_MESSAGES[created]);

  return signedIn(created, await openSession(env, created.userId, Date.now()));
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as Credentials;
  const email = asText(body.email);
  const password = asText(body.password);
  if (email === undefined || password === undefined) {
    return problem(400, "Adresse et mot de passe sont requis.");
  }

  const account = await authenticate(env, email, password);
  // Un seul message pour les deux cas : dire lequel est faux révélerait quelles
  // adresses sont inscrites.
  if (account === undefined) return problem(401, "Identifiants invalides.");

  return signedIn(account, await openSession(env, account.userId, Date.now()));
}

async function handleLogout(request: Request, env: Env): Promise<Response> {
  const token = currentToken(request);
  if (token !== undefined) await closeSession(env, token);
  return new Response(null, { status: 204, headers: { "Set-Cookie": clearedCookie() } });
}

function signedIn(account: Account, token: string): Response {
  return Response.json(
    { signedIn: true, handle: account.handle },
    { headers: { "Set-Cookie": sessionCookie(token) } },
  );
}

function problem(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}

function asText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

const REGISTRATION_MESSAGES = {
  "email-taken": "Cette adresse est déjà utilisée.",
  "handle-taken": "Ce pseudo est déjà pris.",
  "weak-password": `Le mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caractères.`,
  "bad-email": "Adresse électronique invalide.",
} as const;
