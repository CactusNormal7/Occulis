import type { PlayerStats } from "./catalog.js";

/** Une partie terminée telle que la lit `readPlayerStats()`. */
export interface FinishedRow {
  readonly player_a: string;
  readonly winner: string | null;
}

/**
 * Les statistiques d'un joueur, depuis ses parties terminées **dans l'ordre de leur fin**
 * — c'est l'ordre qui fait une série. Pur : la requête est à part.
 */
export function statsFrom(rows: readonly FinishedRow[], playerId: string, rating: number): PlayerStats {
  let won = 0;
  let lost = 0;
  let streak = 0;
  let bestStreak = 0;
  for (const row of rows) {
    const seat = row.player_a === playerId ? "A" : "B";
    if (row.winner === seat) {
      won += 1;
      streak += 1;
      bestStreak = Math.max(bestStreak, streak);
    } else {
      if (row.winner !== null) lost += 1;
      streak = 0;
    }
  }
  return { played: rows.length, won, lost, bestStreak, rating };
}

/** Lit en D1 de quoi calculer les statistiques d'un joueur. */
export async function readPlayerStats(db: D1Database, playerId: string): Promise<PlayerStats> {
  const [player, matches] = await db.batch<{ elo?: number; player_a?: string; winner?: string | null }>([
    db.prepare("SELECT elo FROM players WHERE id = ?").bind(playerId),
    db
      .prepare(
        `SELECT player_a, json_extract(outcome, '$.winner') AS winner FROM matches
         WHERE (player_a = ?1 OR player_b = ?1) AND finished_at IS NOT NULL
         ORDER BY finished_at ASC`,
      )
      .bind(playerId),
  ]);
  const rating = (player?.results[0] as { elo?: number } | undefined)?.elo ?? 1200;
  return statsFrom((matches?.results ?? []) as FinishedRow[], playerId, rating);
}
