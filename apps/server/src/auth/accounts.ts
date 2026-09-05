import { SESSION_TTL_MS } from "./cookie.js";
import { hashPassword, hashToken, newSessionToken, verifyPassword } from "./password.js";

/**
 * Comptes et sessions en D1. C'est ici, et nulle part ailleurs, que `users`,
 * `players` et `sessions` sont écrites.
 *
 * Un compte (`users`) et un profil de jeu (`players`) sont deux choses distinctes,
 * comme le prévoit le schéma : l'un porte l'identité et le secret, l'autre le pseudo
 * affiché et l'ELO. L'inscription crée les deux d'un coup.
 */
export interface Account {
  readonly userId: string;
  readonly playerId: string;
  readonly handle: string;
}

export type RegistrationError = "email-taken" | "handle-taken" | "weak-password" | "bad-email";

export async function register(
  env: Env,
  email: string,
  password: string,
  handle: string,
  now: number,
): Promise<Account | RegistrationError> {
  const normalized = normalizeEmail(email);
  if (!looksLikeEmail(normalized)) return "bad-email";
  if (password.length < MIN_PASSWORD) return "weak-password";

  const userId = crypto.randomUUID();
  const playerId = crypto.randomUUID();

  try {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO players (id, handle, created_at) VALUES (?, ?, ?)").bind(
        playerId,
        handle,
        now,
      ),
      env.DB.prepare(
        "INSERT INTO users (id, email, password_hash, player_id, created_at) VALUES (?, ?, ?, ?, ?)",
      ).bind(userId, normalized, await hashPassword(password), playerId, now),
    ]);
  } catch (cause) {
    // D1 ne distingue pas les contraintes d'unicité autrement que par le message :
    // on interroge donc la base pour dire *laquelle* a cédé, plutôt que de rendre une
    // erreur opaque à quelqu'un qui ne peut rien en faire.
    if (!String(cause).includes("UNIQUE")) throw cause;
    const taken = await env.DB.prepare("SELECT 1 FROM users WHERE email = ?")
      .bind(normalized)
      .first();
    return taken === null ? "handle-taken" : "email-taken";
  }

  return { userId, playerId, handle };
}

/**
 * Vérifie des identifiants. Ne dit **jamais** si c'est l'adresse ou le mot de passe qui
 * est faux : la distinction dirait à un inconnu quelles adresses sont inscrites.
 */
export async function authenticate(
  env: Env,
  email: string,
  password: string,
): Promise<Account | undefined> {
  const row = await env.DB.prepare(
    `SELECT users.id AS user_id, users.password_hash, players.id AS player_id, players.handle
     FROM users JOIN players ON players.id = users.player_id
     WHERE users.email = ?`,
  )
    .bind(normalizeEmail(email))
    .first<{ user_id: string; password_hash: string; player_id: string; handle: string }>();

  if (row === null) return undefined;
  if (!(await verifyPassword(password, row.password_hash))) return undefined;
  return { userId: row.user_id, playerId: row.player_id, handle: row.handle };
}

/** Ouvre une session et rend le jeton **en clair** : c'est la seule fois qu'il existe. */
export async function openSession(env: Env, userId: string, now: number): Promise<string> {
  const token = newSessionToken();
  await env.DB.prepare(
    "INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
  )
    .bind(await hashToken(token), userId, now, now + SESSION_TTL_MS)
    .run();
  return token;
}

export async function closeSession(env: Env, token: string): Promise<void> {
  await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await hashToken(token)).run();
}

/** Le compte derrière un jeton de session, ou rien s'il est inconnu ou périmé. */
export async function accountFor(
  env: Env,
  token: string | undefined,
  now: number,
): Promise<Account | undefined> {
  if (token === undefined || token.length === 0) return undefined;

  const row = await env.DB.prepare(
    `SELECT users.id AS user_id, players.id AS player_id, players.handle
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     JOIN players ON players.id = users.player_id
     WHERE sessions.token_hash = ? AND sessions.expires_at > ?`,
  )
    .bind(await hashToken(token), now)
    .first<{ user_id: string; player_id: string; handle: string }>();

  if (row === null) return undefined;
  return { userId: row.user_id, playerId: row.player_id, handle: row.handle };
}

const MIN_PASSWORD = 10;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Volontairement permissif : la seule validation qui vaille est l'envoi d'un message,
 * et une expression trop stricte rejetterait des adresses valides.
 */
function looksLikeEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email) && email.length <= 254;
}
