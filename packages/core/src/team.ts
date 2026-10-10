import { type Coord, coordKey } from "./coord.js";
import type { Piece, PieceKind, PieceRole, PlayerId, Ruleset } from "./pieces/index.js";
import { type Result, err, ok } from "./result.js";

/**
 * Le déploiement : chaque joueur compose son équipe et la pose dans sa zone avant le
 * premier tour (docs/design.md section 7). Le placement adverse n'a rien de secret par
 * construction — il l'est par la LOS, les zones des cartes étant dessinées sans vue
 * mutuelle.
 */

/** Une pièce de l'équipe à déployer : son type, et la case choisie dans la zone. */
export interface TeamEntry {
  readonly kind: PieceKind;
  readonly coord: Coord;
}

export type Teams = Readonly<Record<PlayerId, readonly TeamEntry[]>>;

/** Ce qu'une carte prévoit pour le déploiement : une zone par camp, et une équipe par défaut. */
export interface Deployment {
  readonly zones: Readonly<Record<PlayerId, readonly Coord[]>>;
  /**
   * L'équipe posée pour un joueur qui n'a rien validé à temps. Elle respecte les quotas du
   * ruleset courant — un test de la carte le vérifie.
   */
  readonly defaultTeams: Teams;
}

export type TeamError =
  /** Le ruleset ne connaît pas de composition : ses parties ne se déploient pas. */
  | { readonly code: "no-team-rules" }
  | { readonly code: "unknown-kind"; readonly kind: string }
  | { readonly code: "wrong-count"; readonly role: PieceRole; readonly expected: number; readonly actual: number }
  | { readonly code: "outside-zone"; readonly coord: Coord }
  | { readonly code: "same-tile"; readonly coord: Coord };

/**
 * Une équipe est-elle déployable dans `zone` ? Types connus, une case de la zone par
 * pièce, et **exactement** les quotas de chaque rôle (`Ruleset.team`).
 *
 * Le serveur l'applique à ce qu'envoie le client, le client à son brouillon : la règle
 * n'existe qu'ici.
 */
export function validateTeam(ruleset: Ruleset, zone: readonly Coord[], entries: readonly TeamEntry[]): Result<readonly TeamEntry[], TeamError> {
  const rules = ruleset.team;
  if (rules === null) return err({ code: "no-team-rules" });

  const allowed = new Set(zone.map(coordKey));
  const taken = new Set<string>();
  const counts: Record<PieceRole, number> = { commander: 0, special: 0, pawn: 0 };
  for (const entry of entries) {
    if (!ruleset.has(entry.kind)) return err({ code: "unknown-kind", kind: entry.kind });
    const key = coordKey(entry.coord);
    if (!allowed.has(key)) return err({ code: "outside-zone", coord: entry.coord });
    if (taken.has(key)) return err({ code: "same-tile", coord: entry.coord });
    taken.add(key);
    counts[ruleset.get(entry.kind).role] += 1;
  }
  for (const role of ["commander", "special", "pawn"] as const) {
    if (counts[role] !== rules[role]) {
      return err({ code: "wrong-count", role, expected: rules[role], actual: counts[role] });
    }
  }
  return ok(entries);
}

/**
 * Les pièces de départ d'une partie, à partir des deux équipes validées.
 *
 * Les identifiants sont tirés de l'ordre des entrées (`a-0`, `a-1`… `b-0`…) : rien
 * d'aléatoire, pour que rejouer le déploiement reconstruise la même position
 * (CLAUDE.md, déterminisme de `core`).
 */
export function deployTeams(
  ruleset: Ruleset,
  deployment: Deployment,
  teams: Teams,
): Result<Piece[], { readonly player: PlayerId; readonly error: TeamError }> {
  const pieces: Piece[] = [];
  for (const player of ["A", "B"] as const) {
    const valid = validateTeam(ruleset, deployment.zones[player], teams[player]);
    if (!valid.ok) return err({ player, error: valid.error });
    valid.value.forEach((entry, index) => {
      pieces.push({ id: `${player.toLowerCase()}-${index}`, kind: entry.kind, owner: player, coord: entry.coord });
    });
  }
  return ok(pieces);
}

/**
 * Transpose une équipe d'une zone à l'autre, case pour case : la i-ème case de `from`
 * devient la i-ème de `to`. Les zones d'une carte se correspondent ainsi (celle du camp B
 * est l'image de celle du camp A) : un preset s'écrit une fois, dans la zone du camp A,
 * et sert quel que soit le camp tenu. Une case hors de `from` est laissée telle quelle —
 * `validateTeam()` la refusera.
 */
export function translateTeam(entries: readonly TeamEntry[], from: readonly Coord[], to: readonly Coord[]): TeamEntry[] {
  const index = new Map(from.map((coord, position) => [coordKey(coord), position]));
  return entries.map((entry) => {
    const position = index.get(coordKey(entry.coord));
    const target = position === undefined ? undefined : to[position];
    return target === undefined ? entry : { ...entry, coord: target };
  });
}

/** Une équipe écrite pour le camp A, posée pour `side`. */
export function teamForSide(deployment: Deployment, entries: readonly TeamEntry[], side: PlayerId): TeamEntry[] {
  return side === "A" ? [...entries] : translateTeam(entries, deployment.zones.A, deployment.zones.B);
}

/**
 * Lit une équipe venue de l'extérieur (un message, une requête, une ligne de base) :
 * la forme seulement — une liste de `{ kind, coord: { x, y } }` à coordonnées entières.
 * Les règles, elles, sont l'affaire de `validateTeam()`.
 */
export function parseTeam(value: unknown): TeamEntry[] | undefined {
  if (!Array.isArray(value) || value.length > MAX_ENTRIES) return undefined;
  const entries: TeamEntry[] = [];
  for (const item of value as unknown[]) {
    if (typeof item !== "object" || item === null) return undefined;
    const { kind, coord } = item as { kind?: unknown; coord?: unknown };
    if (typeof kind !== "string" || kind.length === 0 || kind.length > 32) return undefined;
    if (typeof coord !== "object" || coord === null) return undefined;
    const { x, y } = coord as { x?: unknown; y?: unknown };
    if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) return undefined;
    entries.push({ kind, coord: { x: x as number, y: y as number } });
  }
  return entries;
}

/** Bien au-delà de toute équipe : ne borne que ce qu'on accepte de lire. */
const MAX_ENTRIES = 64;
