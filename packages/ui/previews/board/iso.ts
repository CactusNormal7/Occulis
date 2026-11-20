import { project, type IsoProjection, type Tile } from "../../src/lab/index.js";
import { COLUMNS, ROWS } from "../board-mock.js";

/** La projection du plateau factice du labo : des cases de 48 × 24, comme le plateau réel. */
export const ISO: IsoProjection = {
  originX: (ROWS * 48) / 2 + 24,
  originY: 48,
  tileWidth: 48,
  tileHeight: 24,
};

export const WALL_HEIGHT = 16;

/** La boîte du dessin : tout le plateau, avec la marge des murs et des pièces. */
export const VIEW = {
  width: ((COLUMNS + ROWS) * ISO.tileWidth) / 2 + 48,
  height: ((COLUMNS + ROWS) * ISO.tileHeight) / 2 + 72,
};

/** Le losange d'une case, relevé de `lift` pixels (le dessus d'un mur). */
export function top(tile: Tile, lift = 0): string {
  const { x, y } = project(tile, ISO);
  const w = ISO.tileWidth / 2;
  const h = ISO.tileHeight / 2;
  return `${x},${y - h - lift} ${x + w},${y - lift} ${x},${y + h - lift} ${x - w},${y - lift}`;
}

/** Le décalage SVG qui pose un dessin au centre d'une case. */
export function placeAt(tile: Tile): string {
  const { x, y } = project(tile, ISO);
  return `translate(${x} ${y})`;
}
