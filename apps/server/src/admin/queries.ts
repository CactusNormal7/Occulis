import {
  advanceMemory,
  createGame,
  scenarioFor,
  startMemory,
  type Action,
  type MatchMemory,
  type Outcome,
  type PlayerId,
} from "@occulis/core";
import type {
  AdminFrame,
  AdminLogEntry,
  AdminMatchDetail,
  AdminMatchPage,
  AdminMatchSummary,
  AdminPlayer,
  AdminStats,
} from "@occulis/protocol";
import { rulesetFor } from "../rulesets.js";
import type { MatchFilter } from "./paging.js";

/**
 * Les lectures du back-office sur D1. Tout ce qui est transversal aux parties vit ici
 * et non dans un Durable Object, qui ne connaît que la sienne (docs/architecture.md
 * section 2). Rien n'y écrit, à l'exception du renommage, qui touche les deux tables
 * portant le pseudo.
 */

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function readStats(db: D1Database, now: number): Promise<AdminStats> {
  const since = now - WEEK_MS;
  // `users.created_at` est en texte ISO (Better Auth), `matches.started_at` en
  // millisecondes : chaque seuil est exprimé dans le format de sa colonne, sans quoi
  // SQLite comparerait un nombre à du texte et rendrait toujours le même résultat.
  const results = await db.batch<Record<string, number>>([
    db
      .prepare(
        `SELECT COUNT(*) AS users,
                COALESCE(SUM(email_verified), 0) AS verified,
                COALESCE(SUM(banned), 0) AS banned,
                COALESCE(SUM(role = 'admin'), 0) AS admins,
                COALESCE(SUM(created_at >= ?), 0) AS recent
         FROM users`,
      )
      .bind(new Date(since).toISOString()),
    db.prepare("SELECT COUNT(*) AS players FROM players"),
    db
      .prepare(
        `SELECT COUNT(*) AS matches,
                COALESCE(SUM(finished_at IS NULL), 0) AS ongoing,
                COALESCE(SUM(started_at >= ?), 0) AS recent
         FROM matches`,
      )
      .bind(since),
    db.prepare("SELECT COUNT(*) AS actions FROM match_actions"),
  ]);

  const row = (index: number): Record<string, number> => results[index]?.results[0] ?? {};
  const u = row(0);
  const m = row(2);
  return {
    users: u["users"] ?? 0,
    verifiedUsers: u["verified"] ?? 0,
    bannedUsers: u["banned"] ?? 0,
    admins: u["admins"] ?? 0,
    signupsLastWeek: u["recent"] ?? 0,
    players: row(1)["players"] ?? 0,
    matches: m["matches"] ?? 0,
    ongoingMatches: m["ongoing"] ?? 0,
    matchesLastWeek: m["recent"] ?? 0,
    actions: row(3)["actions"] ?? 0,
  };
}

export interface MatchRow {
  id: string;
  player_a: string;
  handle_a: string;
  player_b: string;
  handle_b: string;
  ruleset_version: string;
  scenario: string;
  started_at: number;
  finished_at: number | null;
  outcome: string | null;
  actions: number;
}

export const MATCH_COLUMNS = `
  m.id, m.player_a, pa.handle AS handle_a, m.player_b, pb.handle AS handle_b,
  m.ruleset_version, m.scenario, m.started_at, m.finished_at, m.outcome,
  (SELECT COUNT(*) FROM match_actions a WHERE a.match_id = m.id) AS actions
  FROM matches m
  JOIN players pa ON pa.id = m.player_a
  JOIN players pb ON pb.id = m.player_b`;

// `?1` et `?2` sont repris tels quels dans les deux requêtes de `listMatches` : le
// décompte doit filtrer exactement comme la page, sinon la pagination ment.
const MATCH_FILTER = `
  WHERE (?1 IS NULL OR m.player_a = ?1 OR m.player_b = ?1)
    AND (?2 IS NULL OR (?2 = 'ongoing' AND m.finished_at IS NULL)
                    OR (?2 = 'finished' AND m.finished_at IS NOT NULL))`;

export async function listMatches(db: D1Database, filter: MatchFilter): Promise<AdminMatchPage> {
  const [page, count] = await db.batch([
    db
      .prepare(`SELECT ${MATCH_COLUMNS} ${MATCH_FILTER} ORDER BY m.started_at DESC LIMIT ?3 OFFSET ?4`)
      .bind(filter.player, filter.status, filter.limit, filter.offset),
    db
      .prepare(`SELECT COUNT(*) AS total FROM matches m ${MATCH_FILTER}`)
      .bind(filter.player, filter.status),
  ]);
  return {
    matches: (page?.results as MatchRow[] | undefined ?? []).map(summary),
    total: (count?.results[0] as { total: number } | undefined)?.total ?? 0,
  };
}

export async function readMatch(db: D1Database, id: string): Promise<AdminMatchDetail | undefined> {
  const [match, log] = await db.batch([
    db.prepare(`SELECT ${MATCH_COLUMNS} WHERE m.id = ?`).bind(id),
    db.prepare("SELECT seq, action FROM match_actions WHERE match_id = ? ORDER BY seq").bind(id),
  ]);
  const row = match?.results[0] as MatchRow | undefined;
  if (row === undefined) return undefined;
  const actions = ((log?.results ?? []) as { action: string }[]).map(
    (entry) => JSON.parse(entry.action) as Action,
  );
  return { ...summary(row), ...annotate(row, actions) };
}

function annotate(
  row: MatchRow,
  actions: readonly Action[],
): { log: AdminLogEntry[]; frames: AdminFrame[]; replayError: string | null } {
  const { frames, players, replayError } = replayLog(row, actions, frameOf);
  return {
    log: actions.map((action, seq) => ({ seq, player: players[seq] ?? null, action })),
    frames,
    replayError,
  };
}

/**
 * Rejoue le log comme `MatchDO.load()` le fait, en gardant une image après chaque coup.
 * Partagé avec le profil (`me/queries.ts`), qui n'en tire que la vue d'un camp.
 *
 * Le camp de chaque coup vient du trait : l'action sérialisée ne nomme pas son auteur,
 * et le déduire de la parité de `seq` supposerait un premier joueur fixe et un coup par
 * tour — deux choses que le scénario et une future résolution différée ne garantissent
 * pas. Les images passent par la mémoire de brouillard (`advanceMemory`) et non par
 * `replay` seul, pour dire aussi ce que chaque camp voyait à cet instant.
 */
export function replayLog<F>(
  row: Pick<MatchRow, "scenario" | "ruleset_version">,
  actions: readonly Action[],
  frame: (memory: MatchMemory) => F,
): { frames: F[]; players: PlayerId[]; replayError: string | null } {
  const frames: F[] = [];
  let replayError: string | null = null;
  let memory: MatchMemory | undefined;
  try {
    const scenario = scenarioFor(row.scenario);
    memory = startMemory(
      createGame(scenario.board(), rulesetFor(row.ruleset_version), [...scenario.pieces]),
    );
    frames.push(frame(memory));
    for (const [seq, action] of actions.entries()) {
      const advanced = advanceMemory(memory, action);
      if (!advanced.ok) {
        replayError = `coup ${seq} : ${advanced.error.code}`;
        break;
      }
      memory = advanced.value;
      frames.push(frame(memory));
    }
  } catch (cause) {
    replayError = String(cause);
  }
  return { frames, players: (memory?.state.history ?? []).map((entry) => entry.player), replayError };
}

/** Le log d'une partie, désérialisé, dans l'ordre de `seq`. */
export async function readLog(db: D1Database, matchId: string): Promise<Action[]> {
  const log = await db.prepare("SELECT action FROM match_actions WHERE match_id = ? ORDER BY seq").bind(matchId).all<{ action: string }>();
  return log.results.map((entry) => JSON.parse(entry.action) as Action);
}

function frameOf(memory: MatchMemory): AdminFrame {
  return {
    pieces: [...memory.state.pieces.values()].map((piece) => ({
      id: piece.id,
      kind: piece.kind,
      owner: piece.owner,
      x: piece.coord.x,
      y: piece.coord.y,
    })),
    visible: { A: [...memory.knowledge.A.visible], B: [...memory.knowledge.B.visible] },
  };
}

export async function readPlayer(db: D1Database, id: string): Promise<AdminPlayer | undefined> {
  // Le vainqueur est rangé par siège (`Outcome.winner`), pas par joueur : il se
  // rapporte au profil par la colonne qui occupe ce siège.
  const row = await db
    .prepare(
      `SELECT p.id, p.handle, p.elo, p.created_at,
              (SELECT u.id FROM users u WHERE u.player_id = p.id) AS user_id,
              (SELECT COUNT(*) FROM matches m WHERE m.player_a = p.id OR m.player_b = p.id) AS played,
              (SELECT COUNT(*) FROM matches m WHERE m.finished_at IS NULL
                 AND (m.player_a = p.id OR m.player_b = p.id)) AS ongoing,
              (SELECT COUNT(*) FROM matches m WHERE
                 (m.player_a = p.id AND json_extract(m.outcome, '$.winner') = 'A') OR
                 (m.player_b = p.id AND json_extract(m.outcome, '$.winner') = 'B')) AS won,
              (SELECT COUNT(*) FROM matches m WHERE
                 (m.player_a = p.id AND json_extract(m.outcome, '$.winner') = 'B') OR
                 (m.player_b = p.id AND json_extract(m.outcome, '$.winner') = 'A')) AS lost
       FROM players p WHERE p.id = ?`,
    )
    .bind(id)
    .first<{
      id: string;
      handle: string;
      elo: number;
      created_at: number;
      user_id: string | null;
      played: number;
      ongoing: number;
      won: number;
      lost: number;
    }>();
  if (row === null) return undefined;
  return {
    id: row.id,
    handle: row.handle,
    elo: row.elo,
    createdAt: row.created_at,
    userId: row.user_id,
    record: { played: row.played, won: row.won, lost: row.lost, ongoing: row.ongoing },
  };
}

export type RenameResult = "renamed" | "unknown-player" | "handle-taken";

/**
 * Renomme un profil **et** le compte qui le possède, dans le même lot : D1 exécute un
 * `batch` en transaction, donc un pseudo déjà pris laisse les deux tables intactes.
 */
export async function renamePlayer(
  db: D1Database,
  id: string,
  handle: string,
  now: number,
): Promise<RenameResult> {
  try {
    const [player] = await db.batch([
      db.prepare("UPDATE players SET handle = ? WHERE id = ?").bind(handle, id),
      db
        .prepare("UPDATE users SET name = ?, updated_at = ? WHERE player_id = ?")
        .bind(handle, new Date(now).toISOString(), id),
    ]);
    return (player?.meta.changes ?? 0) === 0 ? "unknown-player" : "renamed";
  } catch (cause) {
    if (String(cause).includes("UNIQUE")) return "handle-taken";
    throw cause;
  }
}

export function summary(row: MatchRow): AdminMatchSummary {
  return {
    id: row.id,
    playerA: { id: row.player_a, handle: row.handle_a },
    playerB: { id: row.player_b, handle: row.handle_b },
    rulesetVersion: row.ruleset_version,
    scenario: row.scenario,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    outcome: row.outcome === null ? null : (JSON.parse(row.outcome) as Outcome),
    actions: row.actions,
  };
}
