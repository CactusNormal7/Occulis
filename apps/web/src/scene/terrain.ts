import type { FillPattern, Graphics } from "pixi.js";
import type { Board, Tile } from "@occulis/core";
import { type IsoProjection, cliffQuads, flattenQuad, project, tileQuad } from "../view/iso.js";
import { topColor } from "../view/matter.js";
import { mixColor } from "../view/pixel.js";
import { BACKGROUND, GEOMETRY } from "../theme.js";

/**
 * Émet la géométrie d'une case dans un `Graphics` fourni, plutôt que d'en
 * posséder un : c'est ce qui permet à `scene.ts` d'entrelacer terrain et pièces
 * dans un seul ordre du peintre, et donc d'occulter correctement.
 *
 * Les faces sont pleines : la matière sombre du plateau masque ce qui est derrière un
 * relief, et l'os n'en dessine que les arêtes.
 */

/** `nearness` vaut 0 sur la case la plus lointaine, 1 sur la plus proche. */
function depthAlpha(nearness: number): number {
  const { depthFadeNear, depthFadeFar } = GEOMETRY;
  return depthFadeFar + (depthFadeNear - depthFadeFar) * nearness;
}

/** Ce qu'il faut à une case pour se peindre, au-delà de sa propre géométrie. */
export interface TilePaint {
  readonly lit: boolean;
  readonly nearness: number;
  /** Un pixel du plateau, en unités logiques. */
  readonly px: number;
  /** La trame un-sur-deux couleur du vide, posée sur ce qui est hors de vue. */
  readonly dither: FillPattern;
}

export function drawTile(
  g: Graphics,
  board: Board,
  tile: Tile,
  paint: TilePaint,
  proj: IsoProjection,
): void {
  const { lit, nearness, px, dither } = paint;
  const alpha =
    (lit ? GEOMETRY.alphaVisible : GEOMETRY.alphaFogged) *
    (tile.passable ? 1 : GEOMETRY.impassableFactor) *
    depthAlpha(nearness);
  const centre = project(tile.coord, tile.height, proj);

  for (const cliff of cliffQuads(board, tile.coord, tile.height, proj)) {
    // Une face à gauche du centre de la case reçoit la lumière, une face à droite l'ombre.
    const mid = (cliff[0].x + cliff[1].x) / 2;
    const side = mid < centre.x ? GEOMETRY.sideLight : GEOMETRY.sideShade;
    const points = flattenQuad(cliff);
    g.poly(points)
      .fill({ color: lit ? side : mixColor(side, BACKGROUND, 0.45) })
      .stroke({ width: GEOMETRY.widthCliff * px, color: GEOMETRY.stroke, alpha: alpha * 0.55 });
  }

  const top = flattenQuad(tileQuad(tile.coord, tile.height, proj));
  g.poly(top).fill({ color: topColor(tile.height, lit) });
  if (!lit) g.poly(top).fill({ fill: dither, alpha: GEOMETRY.fogDitherAlpha });
  g.poly(top).stroke({ width: GEOMETRY.widthTop * px, color: GEOMETRY.stroke, alpha });
}
