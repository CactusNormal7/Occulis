import {
  CURRENT_RULESET_VERSION,
  DEFAULT_SCENARIO,
  type TeamEntry,
  parseTeam,
  rulesetFor,
  scenarioFor,
  validateTeam,
} from "@occulis/core";
import type { TeamPreset, TeamPresetList } from "@occulis/protocol";

/**
 * Les équipes préparées d'avance (`team_presets`), **toutes bornées au joueur de la
 * session** comme le reste de `me/`. Une équipe se prépare pour la carte et le ruleset
 * des nouvelles parties, dans la zone du camp A (`TeamPreset`).
 *
 * La validité n'est pas figée à l'enregistrement : elle est recalculée à chaque lecture
 * contre les règles de **son** ruleset et de **sa** carte. Un preset que de nouvelles
 * règles rendent caduc est gardé et signalé (`valid: false`), jamais effacé en silence.
 */
export const PRESET_LIMIT = 10;
const NAME_MAX = 32;

export type PresetError = "PRESET_NAME" | "PRESET_TEAM" | "PRESET_LIMIT" | "PRESET_NOT_FOUND";

interface PresetRow {
  id: string;
  name: string;
  scenario: string;
  ruleset_version: string;
  team: string;
  is_default: number;
  updated_at: number;
}

export async function listPresets(db: D1Database, playerId: string): Promise<TeamPresetList> {
  const rows = await db
    .prepare("SELECT id, name, scenario, ruleset_version, team, is_default, updated_at FROM team_presets WHERE player_id = ? ORDER BY updated_at DESC")
    .bind(playerId)
    .all<PresetRow>();
  return {
    presets: rows.results.map(toPreset),
    scenario: DEFAULT_SCENARIO,
    rulesetVersion: CURRENT_RULESET_VERSION,
    limit: PRESET_LIMIT,
  };
}

export type PresetResult = { readonly ok: true; readonly preset: TeamPreset } | { readonly ok: false; readonly code: PresetError };

/** Crée un preset pour la carte et le ruleset courants. Le premier devient celui par défaut. */
export async function createPreset(db: D1Database, playerId: string, body: unknown, now: number): Promise<PresetResult> {
  const input = readInput(body, true);
  if (!input.ok) return input;
  const count = await db.prepare("SELECT COUNT(*) AS n FROM team_presets WHERE player_id = ?").bind(playerId).first<{ n: number }>();
  if ((count?.n ?? 0) >= PRESET_LIMIT) return { ok: false, code: "PRESET_LIMIT" };

  const id = crypto.randomUUID();
  const isDefault = (count?.n ?? 0) === 0 ? 1 : 0;
  await db
    .prepare(
      `INSERT INTO team_presets (id, player_id, name, scenario, ruleset_version, team, is_default, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, playerId, input.name, DEFAULT_SCENARIO, CURRENT_RULESET_VERSION, JSON.stringify(input.team), isDefault, now, now)
    .run();
  return readPreset(db, playerId, id);
}

/**
 * Renomme et/ou remplace l'équipe d'un preset. Il est alors **rattaché à la carte et au
 * ruleset courants** : c'est contre eux que la nouvelle équipe vient d'être validée.
 */
export async function updatePreset(db: D1Database, playerId: string, id: string, body: unknown, now: number): Promise<PresetResult> {
  const input = readInput(body, false);
  if (!input.ok) return input;
  const changed = await db
    .prepare(
      `UPDATE team_presets SET
         name = COALESCE(?1, name),
         team = COALESCE(?2, team),
         scenario = CASE WHEN ?2 IS NULL THEN scenario ELSE ?3 END,
         ruleset_version = CASE WHEN ?2 IS NULL THEN ruleset_version ELSE ?4 END,
         updated_at = ?5
       WHERE id = ?6 AND player_id = ?7`,
    )
    .bind(
      input.name ?? null,
      input.team === undefined ? null : JSON.stringify(input.team),
      DEFAULT_SCENARIO,
      CURRENT_RULESET_VERSION,
      now,
      id,
      playerId,
    )
    .run();
  if (changed.meta.changes === 0) return { ok: false, code: "PRESET_NOT_FOUND" };
  return readPreset(db, playerId, id);
}

/** Supprime un preset ; s'il était celui par défaut, le plus récent des autres le devient. */
export async function deletePreset(db: D1Database, playerId: string, id: string): Promise<boolean> {
  const removed = await db.prepare("DELETE FROM team_presets WHERE id = ? AND player_id = ? RETURNING is_default").bind(id, playerId).first<{ is_default: number }>();
  if (removed === null) return false;
  if (removed.is_default === 1) {
    await db
      .prepare(
        `UPDATE team_presets SET is_default = 1 WHERE id =
           (SELECT id FROM team_presets WHERE player_id = ? ORDER BY updated_at DESC LIMIT 1)`,
      )
      .bind(playerId)
      .run();
  }
  return true;
}

/** Fait d'un preset celui qui se précharge au déploiement — un seul à la fois. */
export async function setDefaultPreset(db: D1Database, playerId: string, id: string): Promise<boolean> {
  const [, set] = await db.batch([
    db.prepare("UPDATE team_presets SET is_default = 0 WHERE player_id = ? AND id != ? AND EXISTS (SELECT 1 FROM team_presets WHERE id = ? AND player_id = ?)").bind(playerId, id, id, playerId),
    db.prepare("UPDATE team_presets SET is_default = 1 WHERE id = ? AND player_id = ?").bind(id, playerId),
  ]);
  return (set?.meta.changes ?? 0) > 0;
}

async function readPreset(db: D1Database, playerId: string, id: string): Promise<PresetResult> {
  const row = await db
    .prepare("SELECT id, name, scenario, ruleset_version, team, is_default, updated_at FROM team_presets WHERE id = ? AND player_id = ?")
    .bind(id, playerId)
    .first<PresetRow>();
  return row === null ? { ok: false, code: "PRESET_NOT_FOUND" } : { ok: true, preset: toPreset(row) };
}

function toPreset(row: PresetRow): TeamPreset {
  const team = parseTeam(safeJson(row.team)) ?? [];
  return {
    id: row.id,
    name: row.name,
    scenario: row.scenario,
    rulesetVersion: row.ruleset_version,
    team,
    isDefault: row.is_default === 1,
    valid: isValid(row.scenario, row.ruleset_version, team),
    updatedAt: row.updated_at,
  };
}

/** Valide une équipe écrite pour le camp A d'une carte, sous un ruleset. */
export function isValid(scenario: string, rulesetVersion: string, team: readonly TeamEntry[]): boolean {
  try {
    const zone = scenarioFor(scenario).deployment?.zones.A;
    return zone !== undefined && validateTeam(rulesetFor(rulesetVersion), zone, team).ok;
  } catch {
    // Une carte ou un ruleset retiré du registre : le preset n'est plus jouable.
    return false;
  }
}

type Input = { readonly ok: true; readonly name?: string; readonly team?: TeamEntry[] } | { readonly ok: false; readonly code: PresetError };

/** Le nom et l'équipe d'une requête ; `required` : les deux doivent y être (création). */
function readInput(body: unknown, required: boolean): Input {
  const { name, team } = (typeof body === "object" && body !== null ? body : {}) as { name?: unknown; team?: unknown };
  let cleanName: string | undefined;
  if (name !== undefined || required) {
    if (typeof name !== "string") return { ok: false, code: "PRESET_NAME" };
    cleanName = name.normalize("NFKC").trim().replace(/\s+/gu, " ");
    const length = [...cleanName].length;
    if (length === 0 || length > NAME_MAX) return { ok: false, code: "PRESET_NAME" };
  }
  let entries: TeamEntry[] | undefined;
  if (team !== undefined || required) {
    entries = parseTeam(team);
    if (entries === undefined || !isValid(DEFAULT_SCENARIO, CURRENT_RULESET_VERSION, entries)) return { ok: false, code: "PRESET_TEAM" };
  }
  return { ok: true, ...(cleanName === undefined ? {} : { name: cleanName }), ...(entries === undefined ? {} : { team: entries }) };
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
