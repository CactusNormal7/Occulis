import { cssColor } from "@occulis/ui/tokens";
import { pixelOf } from "./canvas-trace.js";
import { type GlyphRect, layoutGlyph, partsOf, rectsOf } from "./glyph-layout.js";
import { type PieceGlyph, litPixels } from "./glyphs.js";
import type { IsoProjection, ScreenPoint } from "./iso.js";
import { mixColor } from "./pixel.js";
import { look } from "./theme.js";

/**
 * Le glyphe d'une pièce en Canvas 2D — la silhouette de `render/pixi/piece-glyph.ts`,
 * sans les effets de partie (colonne de lumière, éclat). Une ombre au sol, le glyphe
 * décalé d'un pixel dans le vide pour le détacher, puis le glyphe lui-même, socle dans le
 * ton d'ombre. Un fantôme n'est qu'un glyphe pâle, sans ombre : un souvenir, pas une
 * présence. Rend le haut du glyphe.
 */
export function paintGlyph(
  context: CanvasRenderingContext2D,
  base: ScreenPoint,
  glyph: PieceGlyph,
  alpha: number,
  proj: IsoProjection,
  color: number,
): ScreenPoint {
  const pieces = look().pieces;
  const background = look().palette.background;
  const layout = layoutGlyph(glyph, base, proj, pixelOf(context));
  const top = { x: layout.center.x, y: layout.top };

  if (alpha < pieces.alphaVisible) {
    fillRects(context, rectsOf(litPixels(glyph), layout), cssColor(color, alpha));
    return top;
  }

  const shadow = proj.tileWidth * proj.scale * pieces.glyph.shadowRatio;
  context.beginPath();
  context.ellipse(base.x, base.y, shadow, shadow / 2, 0, 0, Math.PI * 2);
  context.fillStyle = cssColor(pieces.shadow, pieces.shadowAlpha);
  context.fill();

  const parts = partsOf(glyph);
  fillRects(context, rectsOf(litPixels(glyph), layout, 1), cssColor(background));
  fillRects(context, rectsOf(parts.body, layout), cssColor(color));
  fillRects(
    context,
    rectsOf(parts.socle, layout),
    cssColor(mixColor(color, background, pieces.faceShade)),
  );
  return top;
}

/** Remplit des carrés en un seul tracé, sans liseré entre voisins. */
function fillRects(
  context: CanvasRenderingContext2D,
  rects: readonly GlyphRect[],
  style: string,
): void {
  context.beginPath();
  for (const rect of rects) context.rect(rect.x, rect.y, rect.size, rect.size);
  context.fillStyle = style;
  context.fill();
}
