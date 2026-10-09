import { viewFor, type MatchMemory, type Outcome, type PlayerId } from "@occulis/core";
import type {
  MeFrame,
  MeFramePiece,
  MeLogEntry,
  MeMatchDetail,
  MeMatchPage,
  MeMatchSummary,
  MeRecord,
  MeResult,
  MeSession,
} from "@occulis/protocol";
import { checkHandle, type HandleError } from "../auth/handle.js";
import { MATCH_COLUMNS, readLog, replayLog, type MatchRow } from "../admin/queries.js";
import type { Page } from "../admin/paging.js";

/**
 * Les lectures et écritures de la page de profil sur D1.
 *
 * **Chaque requête est bornée par l'identifiant tiré de la session** (`playerId`,
 * `userId`) et le reprend dans sa clause `WHERE` : aucune ne cherche une ligne par le
 * seul identifiant venu de l'URL. Une partie, une session ou un profil d'autrui donne
 * donc « introuvable », exactement comme une ligne qui n'existe pas.
 */

/** Un pseudo se change au plus une fois par période, pour qu'il reste un repère. */
export const HANDLE_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

export function nextHandleChange(changedAt: number | null, now: number): number | null {
  if (changedAt === null) return null;
  const next = changedAt + HANDLE_COOLDOWN_MS;
  return next > now ? next : null;
}

export interface ProfileRow {
  readonly handleChangedAt: number | null;
  readonly createdAt: number;
  readonly hasPassword: boolean;
  readonly providers: string[];
  readonly record: MeRecord;
}

export async function readProfileRow(db: D1Database, userId: string, playerId: string): Promise<ProfileRow> {
  const [player, user, accounts, record] = await db.batch([
    db.prepare("SELECT handle_changed_at FROM players WHERE id = ?").bind(playerId),
    db.prepare("SELECT created_at FROM users WHERE id = ?").bind(userId),
    db.prepare("SELECT provider_id, password IS NOT NULL AS has_password FROM accounts WHERE user_id = ?").bind(userId),
    // Le vainqueur est rangé par siège (`Outcome.winner`) : il se rapporte au joueur par
    // la colonne qui occupe ce siège, comme dans `admin/queries.ts`.
    db
      .prepare(
        `SELECT COUNT(*) AS played,
                COALESCE(SUM(finished_at IS NULL), 0) AS ongoing,
                COALESCE(SUM((player_a = ?1 AND json_extract(outcome, '$.winner') = 'A') OR
                             (player_b = ?1 AND json_extract(outcome, '$.winner') = 'B')), 0) AS won,
                COALESCE(SUM((player_a = ?1 AND json_extract(outcome, '$.winner') = 'B') OR
                             (player_b = ?1 AND json_extract(outcome, '$.winner') = 'A')), 0) AS lost
         FROM matches WHERE player_a = ?1 OR player_b = ?1`,
      )
      .bind(playerId),
  ]);
  const linked = (accounts?.results ?? []) as { provider_id: string; has_password: number }[];
  const counts = (record?.results[0] ?? {}) as Partial<Record<keyof MeRecord, number>>;
  const createdAt = (user?.results[0] as { created_at: string } | undefined)?.created_at;
  return {
    handleChangedAt: (player?.results[0] as { handle_changed_at: number | null } | undefined)?.handle_changed_at ?? null,
    createdAt: createdAt === undefined ? 0 : Date.parse(createdAt),
    hasPassword: linked.some((account) => account.provider_id === "credential" && account.has_password === 1),
    providers: linked.map((account) => account.provider_id).filter((provider) => provider !== "credential"),
    record: {
      played: counts.played ?? 0,
      won: counts.won ?? 0,
      lost: counts.lost ?? 0,
      ongoing: counts.ongoing ?? 0,
    },
  };
}

export type HandleChange =
  | { readonly ok: true; readonly handle: string; readonly nextHandleChangeAt: number }
  | { readonly ok: false; readonly code: HandleError | "HANDLE_TAKEN" | "HANDLE_UNCHANGED" | "HANDLE_COOLDOWN" };

/**
 * Change le pseudo du joueur, dans les deux tables qui le portent.
 *
 * Le délai est vérifié **dans la requête d'écriture elle-même** (`WHERE … <= ?`) et pas
 * seulement lu avant : deux requêtes simultanées ne peuvent pas passer toutes les deux.
 * Le lot est une transaction (D1 `batch`) ; la seconde instruction ne touche `users`
 * que si la première a effectivement écrit le nouveau pseudo.
 */
export async function changeHandle(db: D1Database, playerId: string, raw: unknown, now: number): Promise<HandleChange> {
  const checked = checkHandle(raw);
  if (!checked.ok) return checked;
  const handle = checked.handle;

  const current = await db.prepare("SELECT handle FROM players WHERE id = ?").bind(playerId).first<{ handle: string }>();
  if (current?.handle === handle) return { ok: false, code: "HANDLE_UNCHANGED" };

  try {
    const [player] = await db.batch([
      db
        .prepare(
          `UPDATE players SET handle = ?1, handle_changed_at = ?2
           WHERE id = ?3 AND (handle_changed_at IS NULL OR handle_changed_at <= ?4)`,
        )
        .bind(handle, now, playerId, now - HANDLE_COOLDOWN_MS),
      db
        .prepare(
          `UPDATE users SET name = ?1, updated_at = ?2
           WHERE player_id = ?3 AND EXISTS (SELECT 1 FROM players WHERE id = ?3 AND handle = ?1)`,
        )
        .bind(handle, new Date(now).toISOString(), playerId),
    ]);
    if ((player?.meta.changes ?? 0) === 0) return { ok: false, code: "HANDLE_COOLDOWN" };
  } catch (cause) {
    if (String(cause).includes("UNIQUE")) return { ok: false, code: "HANDLE_TAKEN" };
    throw cause;
  }
  return { ok: true, handle, nextHandleChangeAt: now + HANDLE_COOLDOWN_MS };
}

interface SessionRow {
  id: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
  user_agent: string | null;
  ip_address: string | null;
  impersonated_by: string | null;
}

/**
 * Les sessions ouvertes du compte. Ni le jeton ni rien qui permette de le reconstituer
 * ne sort d'ici : la session se désigne par son identifiant de ligne. C'est pour cela
 * que le profil ne passe pas par `/api/auth/list-sessions`, qui rend les jetons au
 * JavaScript de la page.
 */
export async function listSessions(db: D1Database, userId: string, currentId: string, now: number): Promise<MeSession[]> {
  const rows = await db
    .prepare(
      `SELECT id, created_at, updated_at, expires_at, user_agent, ip_address, impersonated_by
       FROM sessions WHERE user_id = ? AND expires_at > ? ORDER BY updated_at DESC`,
    )
    .bind(userId, new Date(now).toISOString())
    .all<SessionRow>();
  return rows.results.map((row) => ({
    id: row.id,
    current: row.id === currentId,
    createdAt: Date.parse(row.created_at),
    lastActiveAt: Date.parse(row.updated_at),
    expiresAt: Date.parse(row.expires_at),
    userAgent: row.user_agent,
    ipAddress: row.ip_address,
    impersonated: row.impersonated_by !== null && row.impersonated_by.length > 0,
  }));
}

/** Faux si la session n'existe pas ou n'appartient pas à ce compte. */
export async function revokeSession(db: D1Database, userId: string, sessionId: string): Promise<boolean> {
  const result = await db.prepare("DELETE FROM sessions WHERE id = ? AND user_id = ?").bind(sessionId, userId).run();
  return result.meta.changes > 0;
}

export async function revokeOtherSessions(db: D1Database, userId: string, currentId: string): Promise<number> {
  const result = await db.prepare("DELETE FROM sessions WHERE user_id = ? AND id != ?").bind(userId, currentId).run();
  return result.meta.changes;
}

export async function listMyMatches(db: D1Database, playerId: string, page: Page): Promise<MeMatchPage> {
  const [rows, count] = await db.batch([
    db
      .prepare(
        `SELECT ${MATCH_COLUMNS} WHERE m.player_a = ?1 OR m.player_b = ?1
         ORDER BY m.started_at DESC LIMIT ?2 OFFSET ?3`,
      )
      .bind(playerId, page.limit, page.offset),
    db.prepare("SELECT COUNT(*) AS total FROM matches WHERE player_a = ?1 OR player_b = ?1").bind(playerId),
  ]);
  return {
    matches: ((rows?.results ?? []) as MatchRow[]).map((row) => mySummary(row, playerId)),
    total: (count?.results[0] as { total: number } | undefined)?.total ?? 0,
  };
}

export type MyMatch = MeMatchDetail | "unknown" | "ongoing";

/**
 * Le replay d'une partie, **vu de son camp seulement**, et seulement une fois finie.
 *
 * Chaque image est `viewFor` au même instant — exactement ce que le Durable Object
 * avait envoyé au joueur pendant la partie : ses pièces, les pièces adverses dans sa
 * ligne de vue, ses fantômes. Une partie en cours est refusée : sinon le replay
 * resservirait la vue courante à qui n'est plus connecté au siège, et plus tard
 * peut-être davantage.
 */
export async function readMyMatch(db: D1Database, playerId: string, matchId: string): Promise<MyMatch> {
  const row = await db
    .prepare(`SELECT ${MATCH_COLUMNS} WHERE m.id = ?1 AND (m.player_a = ?2 OR m.player_b = ?2)`)
    .bind(matchId, playerId)
    .first<MatchRow>();
  if (row === null) return "unknown";
  if (row.finished_at === null) return "ongoing";

  const summary = mySummary(row, playerId);
  const seat = summary.seat;
  const actions = await readLog(db, matchId);
  const { frames, players, replayError } = replayLog(row, actions, (memory) => seatFrame(memory, seat));
  const log: MeLogEntry[] = actions.map((action, seq) => {
    const player = players[seq] ?? null;
    return { seq, player, action: player === seat || action.kind === "resign" ? action : null };
  });
  return { ...summary, log, frames, replayError };
}

function seatFrame(memory: MatchMemory, seat: PlayerId): MeFrame {
  const view = viewFor(memory.state, memory.knowledge[seat]);
  const piece = (p: { id: string; kind: string; owner: PlayerId; coord: { x: number; y: number } }): MeFramePiece => ({
    id: p.id,
    kind: p.kind,
    owner: p.owner,
    x: p.coord.x,
    y: p.coord.y,
  });
  return {
    pieces: [...view.ownPieces, ...view.visibleEnemies].map(piece),
    ghosts: view.ghosts.map(piece),
    visible: [...view.visible].sort((a, b) => a.localeCompare(b)),
  };
}

function mySummary(row: MatchRow, playerId: string): MeMatchSummary {
  const seat: PlayerId = row.player_a === playerId ? "A" : "B";
  const outcome = row.outcome === null ? null : (JSON.parse(row.outcome) as Outcome);
  return {
    id: row.id,
    seat,
    opponent: seat === "A" ? row.handle_b : row.handle_a,
    scenario: row.scenario,
    rulesetVersion: row.ruleset_version,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    outcome,
    result: resultFor(outcome, row.finished_at, seat),
    actions: row.actions,
  };
}

export function resultFor(outcome: Outcome | null, finishedAt: number | null, seat: PlayerId): MeResult {
  if (finishedAt === null) return "ongoing";
  if (outcome === null) return "ended";
  return outcome.winner === seat ? "won" : "lost";
}
