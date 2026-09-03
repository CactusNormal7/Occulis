import type { Graphics } from "pixi.js";
import type { Board, Tile } from "@occulis/core";
import { type IsoProjection, cliffQuads, flattenQuad, tileQuad } from "../view/iso.js";
import { GEOMETRY } from "../theme.js";

/**
 * Émet la géométrie d'une case dans un `Graphics` fourni, plutôt que d'en
 * posséder un : c'est ce qui permet à `scene.ts` d'entrelacer terrain et pièces
 * dans un seul ordre du peintre, et donc d'occulter correctement.
 */

/** `nearness` vaut 0 sur la case la plus lointaine, 1 sur la plus proche. */
function depthAlpha(nearness: number): number {
  const { depthFadeNear, depthFadeFar } = GEOMETRY;
  return depthFadeFar + (depthFadeNear - depthFadeFar) * nearness;
}

export function drawTile(
  g: Graphics,
  board: Board,
  tile: Tile,
  lit: boolean,
  nearness: number,
  proj: IsoProjection,
): void {
  const alpha =
    (lit ? GEOMETRY.alphaVisible : GEOMETRY.alphaFogged) *
    (tile.passable ? 1 : GEOMETRY.impassableFactor) *
    depthAlpha(nearness);

  for (const cliff of cliffQuads(board, tile.coord, tile.height, proj)) {
    g.poly(flattenQuad(cliff))
      .fill({ color: GEOMETRY.fill, alpha: GEOMETRY.fillAlpha })
      .stroke({ width: GEOMETRY.widthCliff, color: GEOMETRY.stroke, alpha });
  }

  g.poly(flattenQuad(tileQuad(tile.coord, tile.height, proj)))
    .fill({ color: GEOMETRY.fill, alpha: GEOMETRY.fillAlpha })
    .stroke({ width: GEOMETRY.widthTop, color: GEOMETRY.stroke, alpha });
}
