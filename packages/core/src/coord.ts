export interface Coord {
  readonly x: number;
  readonly y: number;
}

/** Clé de hachage d'une coordonnée, pour indexer Map/Set sans allouer d'objets. */
export type CoordKey = string;

export function coordKey(c: Coord): CoordKey {
  return `${c.x},${c.y}`;
}

export function parseCoordKey(key: CoordKey): Coord {
  const comma = key.indexOf(",");
  return { x: Number(key.slice(0, comma)), y: Number(key.slice(comma + 1)) };
}

export function coordEquals(a: Coord, b: Coord): boolean {
  return a.x === b.x && a.y === b.y;
}

/**
 * Topologie d'adjacence de la grille. Non tranché dans docs/design.md — c'est donc
 * un paramètre du profil de pièce (voir MovementProfile) et jamais une constante
 * globale, pour que le futur roster puisse trancher pièce par pièce.
 */
export type Adjacency = "orthogonal" | "octile";

const ORTHOGONAL_STEPS: readonly Coord[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

const DIAGONAL_STEPS: readonly Coord[] = [
  { x: 1, y: 1 },
  { x: 1, y: -1 },
  { x: -1, y: 1 },
  { x: -1, y: -1 },
];

const OCTILE_STEPS: readonly Coord[] = [...ORTHOGONAL_STEPS, ...DIAGONAL_STEPS];

export function steps(adjacency: Adjacency): readonly Coord[] {
  return adjacency === "orthogonal" ? ORTHOGONAL_STEPS : OCTILE_STEPS;
}

export function neighbors(c: Coord, adjacency: Adjacency): Coord[] {
  return steps(adjacency).map((s) => ({ x: c.x + s.x, y: c.y + s.y }));
}

export function areAdjacent(a: Coord, b: Coord, adjacency: Adjacency): boolean {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  if (dx === 0 && dy === 0) return false;
  return adjacency === "orthogonal" ? dx + dy === 1 : dx <= 1 && dy <= 1;
}

export function chebyshevDistance(a: Coord, b: Coord): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export function manhattanDistance(a: Coord, b: Coord): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
