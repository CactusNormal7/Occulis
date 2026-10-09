import type { MeFeats } from "@occulis/protocol";
import { FEAT_IDS, SHOWCASE_SIZE, isFeatId, shownFeats, unlockedFeats } from "../feats/catalog.js";
import { readPlayerStats } from "../feats/stats.js";

/** Le catalogue des faits d'armes, ce que le joueur en a débloqué, et ce qu'il exhibe. */
export async function readMyFeats(db: D1Database, playerId: string): Promise<MeFeats> {
  const [stats, row] = await Promise.all([
    readPlayerStats(db, playerId),
    db.prepare("SELECT showcase FROM players WHERE id = ?").bind(playerId).first<{ showcase: string | null }>(),
  ]);
  const unlocked = unlockedFeats(stats);
  const open = new Set<string>(unlocked);
  return {
    feats: FEAT_IDS.map((id) => ({ id, unlocked: open.has(id) })),
    showcase: shownFeats(parse(row?.showcase ?? null), unlocked),
  };
}

export type ShowcaseResult = { readonly ok: true; readonly showcase: string[] } | { readonly ok: false; readonly code: "SHOWCASE_INVALID" };

/**
 * Enregistre le choix d'exhibition. Refusé en bloc s'il nomme un fait inconnu, non
 * débloqué, en double, ou plus de trois : on n'exhibe que ce qu'on a gagné.
 */
export async function setShowcase(db: D1Database, playerId: string, body: unknown): Promise<ShowcaseResult> {
  const feats = (typeof body === "object" && body !== null ? (body as { feats?: unknown }).feats : undefined) as unknown;
  if (!Array.isArray(feats) || feats.length > SHOWCASE_SIZE || new Set(feats).size !== feats.length) {
    return { ok: false, code: "SHOWCASE_INVALID" };
  }
  const unlocked = new Set<string>(unlockedFeats(await readPlayerStats(db, playerId)));
  if (!feats.every((id) => isFeatId(id) && unlocked.has(id))) return { ok: false, code: "SHOWCASE_INVALID" };
  await db.prepare("UPDATE players SET showcase = ? WHERE id = ?").bind(JSON.stringify(feats), playerId).run();
  return { ok: true, showcase: feats as string[] };
}

function parse(text: string | null): unknown {
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
