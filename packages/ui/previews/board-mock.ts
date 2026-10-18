/**
 * Un plateau factice pour les prototypes du labo : quelques murs, deux camps, une ligne de
 * vue simplifiée (rayon de 3 cases, occultée par les murs). Ce n'est **pas** la règle du jeu
 * — elle vit dans `packages/core`, que la charte n'importe pas — seulement de quoi mettre en
 * scène un coup, une vague de ligne de vue et un fog.
 */
import type { Tile } from "../src/lab/index.js";

export type Role = "master" | "ability" | "pawn";

export interface MockPiece {
  readonly id: string;
  readonly camp: "A" | "B";
  readonly role: Role;
  readonly at: Tile;
}

export const COLUMNS = 9;
export const ROWS = 9;

export const WALLS: readonly Tile[] = [
  { x: 3, y: 2 },
  { x: 3, y: 3 },
  { x: 3, y: 4 },
  { x: 5, y: 5 },
  { x: 6, y: 5 },
  { x: 1, y: 3 },
  { x: 6, y: 1 },
];

export const START: readonly MockPiece[] = [
  { id: "a-master", camp: "A", role: "master", at: { x: 1, y: 7 } },
  { id: "a-ability", camp: "A", role: "ability", at: { x: 3, y: 6 } },
  { id: "a-pawn-1", camp: "A", role: "pawn", at: { x: 2, y: 5 } },
  { id: "a-pawn-2", camp: "A", role: "pawn", at: { x: 5, y: 7 } },
  { id: "b-master", camp: "B", role: "master", at: { x: 7, y: 1 } },
  { id: "b-ability", camp: "B", role: "ability", at: { x: 5, y: 3 } },
  { id: "b-pawn-1", camp: "B", role: "pawn", at: { x: 7, y: 4 } },
  { id: "b-pawn-2", camp: "B", role: "pawn", at: { x: 4, y: 1 } },
];

export const key = (tile: Tile): string => `${tile.x},${tile.y}`;
const wallKeys = new Set(WALLS.map(key));

export function isWall(tile: Tile): boolean {
  return wallKeys.has(key(tile));
}

export function onBoard(tile: Tile): boolean {
  return tile.x >= 0 && tile.y >= 0 && tile.x < COLUMNS && tile.y < ROWS;
}

export function allTiles(): Tile[] {
  return Array.from({ length: ROWS }, (_, y) => Array.from({ length: COLUMNS }, (_, x) => ({ x, y }))).flat();
}

export function chebyshev(a: Tile, b: Tile): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

/** Les cases strictement entre `a` et `b`, par Bresenham. */
function between(a: Tile, b: Tile): Tile[] {
  const cells: Tile[] = [];
  let { x, y } = a;
  const dx = Math.abs(b.x - a.x);
  const dy = -Math.abs(b.y - a.y);
  const sx = a.x < b.x ? 1 : -1;
  const sy = a.y < b.y ? 1 : -1;
  let error = dx + dy;
  while (x !== b.x || y !== b.y) {
    const doubled = 2 * error;
    if (doubled >= dy) {
      error += dy;
      x += sx;
    }
    if (doubled <= dx) {
      error += dx;
      y += sy;
    }
    if (x !== b.x || y !== b.y) cells.push({ x, y });
  }
  return cells;
}

export const SIGHT = 3;

/** Les cases que voit un camp : à 3 cases au plus d'une de ses pièces, sans mur entre. */
export function visibleTo(camp: "A" | "B", pieces: readonly MockPiece[]): Set<string> {
  const seen = new Set<string>();
  for (const piece of pieces.filter((p) => p.camp === camp)) {
    for (const tile of allTiles()) {
      if (chebyshev(piece.at, tile) > SIGHT) continue;
      if (between(piece.at, tile).some(isWall)) continue;
      seen.add(key(tile));
    }
  }
  return seen;
}

/** Les destinations d'une pièce : deux pas de roi au plus, ni mur, ni case occupée, sans traverser. */
export function destinations(piece: MockPiece, pieces: readonly MockPiece[]): Map<string, number> {
  const occupied = new Set(pieces.map((p) => key(p.at)));
  const reached = new Map<string, number>([[key(piece.at), 0]]);
  const queue: Tile[] = [piece.at];
  for (let head = 0; head < queue.length; head += 1) {
    const tile = queue[head] as Tile;
    const distance = reached.get(key(tile)) ?? 0;
    if (distance === 2) continue;
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        const next = { x: tile.x + dx, y: tile.y + dy };
        if (!onBoard(next) || isWall(next) || occupied.has(key(next)) || reached.has(key(next))) continue;
        reached.set(key(next), distance + 1);
        queue.push(next);
      }
    }
  }
  reached.delete(key(piece.at));
  return reached;
}
