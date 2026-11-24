import type { Graphics } from "pixi.js";
import type { IsoProjection, ScreenPoint } from "@occulis/board/iso";
import { glyphOf } from "@occulis/board/glyphs";
import { look } from "@occulis/board/theme";
import { drawGlyph } from "./piece-glyph.js";
import { drawObelisk } from "./piece-obelisk.js";
import type { PiecePaint } from "./piece-paint.js";

export type { PiecePaint } from "./piece-paint.js";

/**
 * Une pièce sur le plateau, dans la silhouette choisie par `look().pieces.style` : le
 * glyphe de son type (`piece-glyph.ts`) ou l'obélisque d'avant (`piece-obelisk.ts`).
 *
 * `PieceDefinition` ne porte aucun champ visuel — `packages/core` n'a aucune dépendance de
 * rendu — donc la correspondance entre un `kind` et une forme appartient au rendu
 * (`@occulis/board/glyphs`).
 */
export function drawPiece(
  g: Graphics,
  base: ScreenPoint,
  paint: PiecePaint,
  proj: IsoProjection,
): void {
  if (look().pieces.style === "obelisk") {
    drawObelisk(g, base, paint, proj);
    return;
  }
  drawGlyph(g, base, glyphOf(paint.kind), paint, proj);
}
