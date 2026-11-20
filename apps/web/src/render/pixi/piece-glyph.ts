import type { Graphics } from "pixi.js";
import {
  type GlyphLayout,
  type GlyphRect,
  layoutGlyph,
  partsOf,
  rectsOf,
} from "@occulis/board/glyph-layout";
import { type PieceGlyph, litPixels } from "@occulis/board/glyphs";
import type { IsoProjection, ScreenPoint } from "@occulis/board/iso";
import { mixColor } from "@occulis/board/pixel";
import { look } from "@occulis/board/theme";
import { drawBeam, type PiecePaint } from "./piece-paint.js";

/**
 * Le glyphe d'une pièce en pixels pleins, propre à son type (`@occulis/board/glyphs`).
 *
 * De bas en haut : la colonne de lumière d'une pièce sélectionnée, l'ombre au sol, le
 * halo, le glyphe décalé d'un pixel dans le vide pour le détacher du relief, puis le
 * glyphe lui-même — socle dans le ton d'ombre, corps dans la couleur du camp, qui blanchit
 * un instant sous un éclat. Un fantôme n'est que la trame du glyphe : un souvenir, pas une
 * présence.
 */
export function drawGlyph(
  g: Graphics,
  base: ScreenPoint,
  glyph: PieceGlyph,
  paint: PiecePaint,
  proj: IsoProjection,
): void {
  const layout = layoutGlyph(glyph, base, proj, paint.px, paint.rise);

  if (paint.beam > 0) {
    drawBeam(g, base, layout.width * 1.4, layout.height * 3, paint.beamColor, paint.beam, paint.px);
  }
  if (paint.ghost) {
    drawGhostPixels(g, glyph, layout, paint);
    return;
  }
  drawGroundShadow(g, base, proj, paint.alpha);
  drawHalo(g, layout, paint);
  drawDropShadow(g, glyph, layout, paint.alpha);
  drawBodyPixels(g, glyph, layout, paint);
}

function drawGroundShadow(
  g: Graphics,
  base: ScreenPoint,
  proj: IsoProjection,
  opacity: number,
): void {
  const pieces = look().pieces;
  const radius = proj.tileWidth * proj.scale * pieces.glyph.shadowRatio;
  g.ellipse(base.x, base.y, radius, radius / 2).fill({
    color: pieces.shadow,
    alpha: pieces.shadowAlpha * opacity,
  });
}

/** La seule lumière qu'une pièce émet, plus vive quand elle s'éveille. */
function drawHalo(g: Graphics, layout: GlyphLayout, paint: PiecePaint): void {
  const radius = layout.width * look().pieces.glyph.haloRatio * (1 + paint.flash);
  g.circle(layout.center.x, layout.center.y, radius).fill({
    color: paint.color,
    alpha: (0.07 + paint.flash * 0.35) * paint.alpha,
  });
}

/** Le glyphe répété un pixel plus bas, dans la couleur du vide : il le détache du sol. */
function drawDropShadow(
  g: Graphics,
  glyph: PieceGlyph,
  layout: GlyphLayout,
  opacity: number,
): void {
  traceRects(g, rectsOf(litPixels(glyph), layout, 1)).fill({
    color: look().palette.background,
    alpha: opacity,
  });
}

function drawBodyPixels(
  g: Graphics,
  glyph: PieceGlyph,
  layout: GlyphLayout,
  paint: PiecePaint,
): void {
  const palette = look().palette;
  const parts = partsOf(glyph);
  traceRects(g, rectsOf(parts.body, layout)).fill({
    color: mixColor(paint.color, palette.ink, paint.flash * 0.7),
    alpha: paint.alpha,
  });
  traceRects(g, rectsOf(parts.socle, layout)).fill({
    color: mixColor(paint.color, palette.background, look().pieces.faceShade),
    alpha: paint.alpha,
  });
}

function drawGhostPixels(
  g: Graphics,
  glyph: PieceGlyph,
  layout: GlyphLayout,
  paint: PiecePaint,
): void {
  traceRects(g, rectsOf(litPixels(glyph), layout)).fill({
    fill: paint.dither,
    alpha: look().pieces.alphaGhost * paint.alpha,
  });
}

/**
 * Trace des carrés dans un seul chemin, rempli d'un coup par l'appelant : posés un par
 * un, deux carrés voisins laisseraient un liseré d'anticrénelage entre eux.
 */
function traceRects(g: Graphics, rects: readonly GlyphRect[]): Graphics {
  for (const rect of rects) g.rect(rect.x, rect.y, rect.size, rect.size);
  return g;
}
