import type { Graphics } from "pixi.js";
import type { Board, Coord } from "@occulis/core";
import { type IsoProjection, type Quad, cliffQuads, flattenQuad, tileQuad } from "../view/iso.js";
import type { Selection } from "../game/selection.js";
import { HOVER, SELECTION } from "../theme.js";

/**
 * Couche de surbrillance : survol et sélection. Dessinée par-dessus le monde et
 * dans son propre `Graphics`, de sorte qu'un mouvement de souris ne reconstruise
 * jamais la géométrie du terrain.
 */

function lerp(range: readonly [number, number], t: number): number {
  return range[0] + (range[1] - range[0]) * t;
}

function topOf(board: Board, coord: Coord, proj: IsoProjection): Quad | undefined {
  const tile = board.getTile(coord);
  return tile === undefined ? undefined : tileQuad(tile.coord, tile.height, proj);
}

/** Les quatre coins de la case, en branches courtes : un réticule plutôt qu'un cadre. */
export function drawHover(
  g: Graphics,
  board: Board,
  coord: Coord,
  proj: IsoProjection,
  px: number,
): void {
  const tile = board.getTile(coord);
  const quad = topOf(board, coord, proj);
  if (tile === undefined || quad === undefined) return;

  for (const cliff of cliffQuads(board, tile.coord, tile.height, proj)) {
    g.poly(flattenQuad(cliff)).stroke({ width: px, color: HOVER.stroke, alpha: HOVER.cliffAlpha });
  }
  g.poly(flattenQuad(quad)).fill({ color: HOVER.fill, alpha: HOVER.fillAlpha });

  quad.forEach((corner, i) => {
    const next = quad[(i + 1) % 4];
    const previous = quad[(i + 3) % 4];
    if (next === undefined || previous === undefined) return;
    const k = HOVER.reticle;
    g.moveTo(corner.x + (previous.x - corner.x) * k, corner.y + (previous.y - corner.y) * k)
      .lineTo(corner.x, corner.y)
      .lineTo(corner.x + (next.x - corner.x) * k, corner.y + (next.y - corner.y) * k)
      .stroke({ width: HOVER.strokeWidth * px, color: HOVER.stroke });
  });
}

/**
 * La pièce sélectionnée, puis ce qu'elle peut faire. Les destinations sont
 * dessinées avant la case d'origine pour que celle-ci reste lisible même quand
 * elles la jouxtent. `glow` (0 → 1) est la respiration des lueurs.
 */
export function drawSelection(
  g: Graphics,
  board: Board,
  selection: Selection,
  proj: IsoProjection,
  px: number,
  glow: number,
): void {
  for (const coord of selection.moves.values()) {
    const quad = topOf(board, coord, proj);
    if (quad === undefined) continue;
    g.poly(flattenQuad(quad))
      .fill({ color: SELECTION.destination, alpha: lerp(SELECTION.destinationFillAlpha, glow) })
      .stroke({
        width: SELECTION.destinationWidth * px,
        color: SELECTION.destination,
        alpha: SELECTION.destinationStrokeAlpha,
      });

    // La gemme centrale : le même losange, réduit autour du centre de la case.
    const cx = (quad[0].x + quad[2].x) / 2;
    const cy = (quad[0].y + quad[2].y) / 2;
    const k = SELECTION.destinationGem;
    g.poly(quad.flatMap((p) => [cx + (p.x - cx) * k, cy + (p.y - cy) * k])).fill({
      color: SELECTION.destination,
      alpha: 0.7 + 0.3 * glow,
    });
  }

  const tile = board.getTile(selection.piece.coord);
  const quad = topOf(board, selection.piece.coord, proj);
  if (tile === undefined || quad === undefined) return;
  for (const cliff of cliffQuads(board, tile.coord, tile.height, proj)) {
    g.poly(flattenQuad(cliff)).stroke({ width: px, color: SELECTION.piece, alpha: 0.5 });
  }
  g.poly(flattenQuad(quad))
    .fill({ color: SELECTION.piece, alpha: lerp(SELECTION.pieceFillAlpha, glow) })
    .stroke({ width: SELECTION.pieceWidth * px, color: SELECTION.piece });
}
