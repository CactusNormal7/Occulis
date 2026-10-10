import type { Board, Coord, PlayerId } from "@occulis/core";
import type { AdminFrame, AdminMatchDetail } from "@occulis/protocol";
import { QUARTER_TURN, type IsoProjection, tileQuad } from "../view/iso.js";
import { messages } from "../i18n/current.js";
import { describeAction, seatHandle } from "./model.js";

/**
 * Ce que le rejeu du back-office décide sans dessiner : quels coups séparent deux
 * images, comment les nommer, à quelle échelle faire tenir le plateau. Pur, comme
 * `model.ts` ; `replay-canvas.ts` en fait le dessin.
 */

/** Point de vue du rejeu : tout voir, ou seulement ce que voyait un camp. */
export type Perspective = "all" | PlayerId;

export interface Move {
  readonly pieceId: string;
  readonly owner: PlayerId;
  readonly from: Coord;
  readonly to: Coord;
}

/**
 * Les pièces qui ont changé de case entre deux images. Comparées par identifiant, et
 * non déduites de l'action : c'est ce que la position montre réellement, y compris le
 * jour où un coup déplacera plus d'une pièce.
 */
export function movesBetween(before: AdminFrame, after: AdminFrame): Move[] {
  const previous = new Map(before.pieces.map((piece) => [piece.id, piece]));
  const moves: Move[] = [];
  for (const piece of after.pieces) {
    const was = previous.get(piece.id);
    if (was !== undefined && (was.x !== piece.x || was.y !== piece.y)) {
      moves.push({ pieceId: piece.id, owner: piece.owner, from: { x: was.x, y: was.y }, to: { x: piece.x, y: piece.y } });
    }
  }
  return moves;
}

/** Le coup `seq` tel qu'on le lit dans l'historique : « 2,4 → 3,4 », ou « abandon ». */
export function describeEntry(match: AdminMatchDetail, seq: number): string {
  const entry = match.log[seq];
  if (entry === undefined) return "";
  const before = match.frames[seq];
  const after = match.frames[seq + 1];
  const [move] = before !== undefined && after !== undefined ? movesBetween(before, after) : [];
  if (move !== undefined) return `${move.from.x},${move.from.y} → ${move.to.x},${move.to.y}`;
  return describeAction(entry.action);
}

/**
 * L'image `index` annoncée en une ligne. L'image 0 est la position de départ ; l'image
 * `n + 1` suit le coup `n`.
 */
export function frameLabel(match: AdminMatchDetail, index: number): string {
  if (index === 0) return messages().admin.match.frameStart;
  const entry = match.log[index - 1];
  if (entry === undefined) return "";
  const who = entry.player === null ? "?" : `${entry.player} · ${seatHandle(match, entry.player)}`;
  return messages().admin.match.frame(index, match.log.length, who, describeEntry(match, index - 1));
}

export function clampFrame(index: number, count: number): number {
  return Math.min(Math.max(index, 0), Math.max(count - 1, 0));
}

/**
 * L'échelle qui fait tenir le plateau dans `width` × `height`, **quel que soit le quart
 * de tour** : calculée une fois pour les quatre, elle ne bouge pas quand on tourne le
 * plateau, qui garderait sinon une taille différente à chaque angle.
 */
export function fitScale(
  board: Board,
  base: Omit<IsoProjection, "scale" | "rotation">,
  width: number,
  height: number,
  padding: number,
): number {
  let scale = Infinity;
  for (let quarter = 0; quarter < 4; quarter += 1) {
    const proj: IsoProjection = { ...base, scale: 1, rotation: quarter * QUARTER_TURN };
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const tile of board.allTiles()) {
      // Le sommet du relief et sa base au sol, plus la place d'une pièce au-dessus.
      for (const level of [0, tile.height, tile.height + 1.6]) {
        for (const corner of tileQuad(tile.coord, level, proj)) {
          minX = Math.min(minX, corner.x);
          maxX = Math.max(maxX, corner.x);
          minY = Math.min(minY, corner.y);
          maxY = Math.max(maxY, corner.y);
        }
      }
    }
    if (minX > maxX) continue;
    scale = Math.min(scale, (width - padding * 2) / (maxX - minX), (height - padding * 2) / (maxY - minY));
  }
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

/**
 * Le décalage qui centre le plateau à l'écran pour une projection donnée — le pivot
 * de rotation n'est pas forcément le centre de l'image projetée, le relief la tirant
 * vers le haut.
 */
export function centerOffset(board: Board, proj: IsoProjection): { x: number; y: number } {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const tile of board.allTiles()) {
    for (const level of [0, tile.height]) {
      for (const corner of tileQuad(tile.coord, level, proj)) {
        minX = Math.min(minX, corner.x);
        maxX = Math.max(maxX, corner.x);
        minY = Math.min(minY, corner.y);
        maxY = Math.max(maxY, corner.y);
      }
    }
  }
  if (minX > maxX) return { x: 0, y: 0 };
  return { x: -(minX + maxX) / 2, y: -(minY + maxY) / 2 };
}
