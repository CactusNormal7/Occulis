import { type GlyphPixel, type PieceGlyph, litPixels } from "./glyphs.js";
import type { IsoProjection, ScreenPoint } from "./iso.js";
import { look } from "./theme.js";

/**
 * Où et à quelle taille poser le glyphe d'une pièce sur sa case. Partagé par les deux
 * moteurs de dessin — PixiJS en partie (`render/pixi/piece-glyph.ts`) et Canvas 2D
 * (`paint-glyph.ts`) — pour qu'une même pièce ait exactement la même taille partout.
 *
 * Le côté d'un pixel du glyphe est un multiple entier du pixel du plateau : sans cela,
 * deux pixels voisins du glyphe n'auraient pas la même largeur à l'écran.
 */
export interface GlyphLayout {
  /** Côté d'un pixel du glyphe, en unités du tracé. */
  readonly cell: number;
  /** Coin haut-gauche du glyphe. */
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  /** Le centre du glyphe, d'où rayonne son halo. */
  readonly center: ScreenPoint;
}

/**
 * Pose le glyphe sur le point `base` (le centre de la case, à sa hauteur), relevé de
 * `rise` unités quand la pièce est sélectionnée.
 *
 * `seat` dit comment il s'y pose : 0, **debout**, le socle sur le centre de la case, comme
 * une figurine vue de biais ; 1, **centré**, ses pixels allumés à mi-hauteur sur le centre
 * — en vue de dessus, une pièce debout déborderait sur la case du dessus. Entre les deux,
 * pendant la bascule de vue, il glisse de l'un à l'autre.
 *
 * `boardPixel` est un pixel du plateau en unités du tracé.
 */
export function layoutGlyph(
  glyph: PieceGlyph,
  base: ScreenPoint,
  projection: IsoProjection,
  boardPixel: number,
  rise: number = 0,
  seat: number = 0,
): GlyphLayout {
  const wanted = projection.tileWidth * projection.scale * look().pieces.glyph.cellRatio;
  const cell = Math.max(boardPixel, Math.round(wanted / boardPixel) * boardPixel);
  const width = glyph.width * cell;
  const height = glyph.height * cell;
  const standing = base.y - height;
  const centred = base.y - litMiddleRow(glyph) * cell;
  const left = snapTo(base.x - width / 2, boardPixel);
  const top = snapTo(standing + (centred - standing) * seat - rise, boardPixel);
  return { cell, left, top, width, height, center: { x: left + width / 2, y: top + height / 2 } };
}

/**
 * Le milieu des lignes allumées, en lignes depuis le haut du glyphe : un pion n'allume
 * pas ses deux lignes du haut, et c'est sa silhouette, non sa grille, qu'on centre.
 */
function litMiddleRow(glyph: PieceGlyph): number {
  const rows = litPixels(glyph).map((pixel) => pixel.row);
  if (rows.length === 0) return glyph.height / 2;
  return (Math.min(...rows) + Math.max(...rows) + 1) / 2;
}

/** Un pixel du glyphe à l'écran : un carré de côté `size`. */
export interface GlyphRect {
  readonly x: number;
  readonly y: number;
  readonly size: number;
}

/** Les pixels allumés d'un glyphe, séparés entre le corps et le socle (le ton d'ombre). */
export interface GlyphParts {
  readonly body: readonly GlyphPixel[];
  readonly socle: readonly GlyphPixel[];
}

export function partsOf(glyph: PieceGlyph): GlyphParts {
  const firstSocleRow = glyph.height - look().pieces.glyph.baseRows;
  const pixels = litPixels(glyph);
  return {
    body: pixels.filter((pixel) => pixel.row < firstSocleRow),
    socle: pixels.filter((pixel) => pixel.row >= firstSocleRow),
  };
}

/**
 * Les carrés à l'écran de quelques pixels du glyphe, décalés de `rowOffset` lignes (une
 * ombre portée). Les dessiner **en un seul tracé** évite les liserés que l'anticrénelage
 * laisse entre deux carrés voisins posés un par un.
 */
export function rectsOf(
  pixels: readonly GlyphPixel[],
  layout: GlyphLayout,
  rowOffset: number = 0,
): readonly GlyphRect[] {
  return pixels.map((pixel) => ({
    x: layout.left + pixel.column * layout.cell,
    y: layout.top + (pixel.row + rowOffset) * layout.cell,
    size: layout.cell,
  }));
}

function snapTo(value: number, grid: number): number {
  return Math.round(value / grid) * grid;
}
