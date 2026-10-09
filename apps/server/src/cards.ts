import type { PlayerCard } from "@occulis/protocol";
import { shownFeats, unlockedFeats } from "./feats/catalog.js";
import { readPlayerStats } from "./feats/stats.js";

/**
 * La carte d'un joueur, telle que son adversaire la voit à l'annonce de la partie. Lue
 * une fois, à la création : elle décrit le joueur **au moment où la partie commence**,
 * et ne change plus ensuite.
 */
export async function readPlayerCard(db: D1Database, playerId: string): Promise<PlayerCard> {
  const [row, stats] = await Promise.all([
    db.prepare("SELECT handle, showcase FROM players WHERE id = ?").bind(playerId).first<{ handle: string; showcase: string | null }>(),
    readPlayerStats(db, playerId),
  ]);
  return {
    handle: row?.handle ?? playerId,
    elo: stats.rating,
    played: stats.played,
    won: stats.won,
    feats: shownFeats(parseJson(row?.showcase ?? null), unlockedFeats(stats)),
  };
}

function parseJson(text: string | null): unknown {
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
