import type { Graphics } from "pixi.js";
import { type Board, type Coord, parseCoordKey } from "@occulis/core";
import { type IsoProjection, cliffQuads, flattenQuad, tileQuad } from "../view/iso.js";
import type { Selection } from "../game/selection.js";
import { HOVER, SELECTION } from "../theme.js";

/**
 * Couche de surbrillance : survol et sélection. Dessinée par-dessus le monde et
 * dans son propre `Graphics`, de sorte qu'un mouvement de souris ne reconstruise
 * jamais la géométrie du terrain.
 */

interface Mark {
  readonly color: number;
  readonly width: number;
  readonly fillAlpha: number;
  /** Souligne aussi les falaises, pour lire la colonne entière en relief. */
  readonly cliffs?: number | undefined;
}

function markTile(g: Graphics, board: Board, coord: Coord, mark: Mark, proj: IsoProjection): void {
  const tile = board.getTile(coord);
  if (tile === undefined) return;

  if (mark.cliffs !== undefined) {
    for (const cliff of cliffQuads(board, tile.coord, tile.height, proj)) {
      g.poly(flattenQuad(cliff)).stroke({
        width: mark.width,
        color: mark.color,
        alpha: mark.cliffs,
      });
    }
  }

  g.poly(flattenQuad(tileQuad(tile.coord, tile.height, proj)))
    .fill({ color: mark.color, alpha: mark.fillAlpha })
    .stroke({ width: mark.width, color: mark.color });
}

export function drawHover(g: Graphics, board: Board, coord: Coord, proj: IsoProjection): void {
  markTile(
    g,
    board,
    coord,
    {
      color: HOVER.stroke,
      width: HOVER.strokeWidth,
      fillAlpha: HOVER.fillAlpha,
      cliffs: HOVER.cliffAlpha,
    },
    proj,
  );
}

/**
 * La pièce sélectionnée, puis ce qu'elle peut faire. Les destinations sont
 * dessinées avant la case d'origine pour que celle-ci reste lisible même quand
 * elles la jouxtent.
 */
export function drawSelection(
  g: Graphics,
  board: Board,
  selection: Selection,
  proj: IsoProjection,
): void {
  for (const coord of selection.moves.values()) {
    markTile(
      g,
      board,
      coord,
      {
        color: SELECTION.destination,
        width: SELECTION.destinationWidth,
        fillAlpha: SELECTION.destinationFillAlpha,
      },
      proj,
    );
  }

  for (const key of selection.strikes.keys()) {
    markTile(
      g,
      board,
      parseCoordKey(key),
      {
        color: SELECTION.strike,
        width: SELECTION.strikeWidth,
        fillAlpha: SELECTION.strikeFillAlpha,
      },
      proj,
    );
  }

  markTile(
    g,
    board,
    selection.piece.coord,
    {
      color: SELECTION.piece,
      width: SELECTION.pieceWidth,
      fillAlpha: SELECTION.pieceFillAlpha,
    },
    proj,
  );
}
