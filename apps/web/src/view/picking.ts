import type { Board, Coord } from "@occulis/core";
import {
  type IsoProjection,
  type Quad,
  type ScreenPoint,
  cliffQuads,
  compareDepth,
  depthOf,
  tileQuad,
} from "./iso.js";

/**
 * Désignation de la case sous un point, en espace de projection.
 *
 * Pas de projection inverse analytique : elle ignorerait la hauteur et
 * désignerait la case du sol dès qu'un relief se dresse devant. Le parcours se
 * fait donc de la case la plus proche à la plus lointaine — l'ordre du peintre
 * inversé — et la première touchée gagne. C'est exact avec le relief comme à
 * n'importe quel angle, sans un objet interactif Pixi par case.
 */

/** Le quadrilatère est convexe par construction : tous les produits vectoriels
 *  d'un point intérieur ont le même signe. */
function containsPoint(quad: Quad, point: ScreenPoint): boolean {
  let positive = false;
  let negative = false;

  for (let i = 0; i < quad.length; i += 1) {
    const a = quad[i];
    const b = quad[(i + 1) % quad.length];
    if (a === undefined || b === undefined) return false;

    const cross = (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x);
    if (cross > 0) positive = true;
    else if (cross < 0) negative = true;
    if (positive && negative) return false;
  }

  return true;
}

export function tileAt(point: ScreenPoint, board: Board, proj: IsoProjection): Coord | undefined {
  const nearestFirst = [...board.allTiles()].sort((a, b) =>
    compareDepth(depthOf(b.coord, b.height, proj), depthOf(a.coord, a.height, proj)),
  );

  for (const tile of nearestFirst) {
    if (containsPoint(tileQuad(tile.coord, tile.height, proj), point)) return tile.coord;
    for (const cliff of cliffQuads(board, tile.coord, tile.height, proj)) {
      if (containsPoint(cliff, point)) return tile.coord;
    }
  }

  return undefined;
}
