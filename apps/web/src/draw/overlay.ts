import type { Graphics } from "pixi.js";
import type { Board, Coord } from "@occulis/core";
import { type IsoProjection, cliffQuads, flattenQuad, tileQuad } from "../iso.js";
import { HOVER } from "../theme.js";

/**
 * Surbrillance de la case survolée. Elle vit dans sa propre couche, dessinée
 * par-dessus le monde : bouger la souris ne reconstruit donc jamais la
 * géométrie du terrain.
 */
export function drawHover(g: Graphics, board: Board, coord: Coord, proj: IsoProjection): void {
  const tile = board.getTile(coord);
  if (tile === undefined) return;

  // Les falaises sont soulignées pour que la colonne entière se lise en relief.
  for (const cliff of cliffQuads(board, tile.coord, tile.height, proj)) {
    g.poly(flattenQuad(cliff)).stroke({
      width: HOVER.strokeWidth,
      color: HOVER.stroke,
      alpha: HOVER.cliffAlpha,
    });
  }

  g.poly(flattenQuad(tileQuad(tile.coord, tile.height, proj)))
    .fill({ color: HOVER.fill, alpha: HOVER.fillAlpha })
    .stroke({ width: HOVER.strokeWidth, color: HOVER.stroke });
}
