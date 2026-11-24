import type { PieceKind } from "@occulis/core";

/**
 * Les glyphes des pièces : une petite image en pixels par type de pièce, la même sur le
 * plateau (PixiJS et Canvas 2D) et dans l'interface (icônes de l'ATH).
 *
 * Chaque glyphe est une grille de texte, `#` pour un pixel allumé et `.` pour un pixel
 * vide, lue de haut en bas : on la modifie à l'œil, sans calcul. Les formes sont
 * **provisoires**, comme le roster qu'elles illustrent (open-points 12) ; un type absent
 * d'ici prend le glyphe de repli, et reste donc dessiné.
 *
 * Ce module ne dessine rien : il dit seulement quels pixels sont allumés.
 */

/** Une grille de pixels : une chaîne par ligne, toutes de même longueur. */
export interface PieceGlyph {
  readonly rows: readonly string[];
  readonly width: number;
  readonly height: number;
}

/** Un pixel allumé, repéré par sa colonne et sa ligne depuis le coin haut-gauche. */
export interface GlyphPixel {
  readonly column: number;
  readonly row: number;
}

const LIT = "#";

/** Le roi : une couronne à trois pointes sur un socle. */
const COMMANDER = [
  "..#.#.#..",
  "..#####..",
  "...###...",
  "..#####..",
  "...###...",
  "...###...",
  "..#####..",
  ".#######.",
  ".#######.",
];

/** L'éclaireur : un œil ouvert au sommet, il voit loin. */
const SCOUT = [
  "....#....",
  "...###...",
  "..##.##..",
  "...###...",
  "....#....",
  "...###...",
  "..#####..",
  ".#######.",
  ".#######.",
];

/** Le fou : une mitre fendue en biais, comme ses déplacements. */
const BISHOP = [
  "....#....",
  "...###...",
  "..##.##..",
  "..#.###..",
  "...###...",
  "...###...",
  "..#####..",
  ".#######.",
  ".#######.",
];

/** La tour : des créneaux au sommet d'un fût droit. */
const ROOK = [
  ".#.#.#.#.",
  ".#######.",
  "..#####..",
  "..#####..",
  "..#####..",
  "..#####..",
  "..#####..",
  ".#######.",
  ".#######.",
];

/** Le trappeur : une mâchoire ouverte au sommet, ses dents tournées vers le haut. */
const TRAPPER = [
  ".#.....#.",
  ".##...##.",
  "..##.##..",
  "...###...",
  "....#....",
  "...###...",
  "..#####..",
  ".#######.",
  ".#######.",
];

/** Le pion : la forme la plus simple, sans signe. */
const PAWN = [
  ".........",
  ".........",
  "...###...",
  "..#####..",
  "...###...",
  "...###...",
  "..#####..",
  ".#######.",
  ".#######.",
];

/** Un type sans glyphe dédié : un losange, pour qu'aucune pièce ne soit invisible. */
const FALLBACK = [
  ".........",
  "....#....",
  "...###...",
  "..#####..",
  "...###...",
  "....#....",
  "..#####..",
  ".#######.",
  ".#######.",
];

const ROWS_BY_KIND: Readonly<Record<PieceKind, readonly string[]>> = {
  commander: COMMANDER,
  scout: SCOUT,
  bishop: BISHOP,
  rook: ROOK,
  trapper: TRAPPER,
  pawn: PAWN,
};

function glyphFromRows(rows: readonly string[]): PieceGlyph {
  return { rows, width: rows[0]?.length ?? 0, height: rows.length };
}

export const FALLBACK_GLYPH: PieceGlyph = glyphFromRows(FALLBACK);

/** Le glyphe d'un type de pièce, ou le glyphe de repli si ce type n'en a pas. */
export function glyphOf(kind: PieceKind): PieceGlyph {
  const rows = ROWS_BY_KIND[kind];
  return rows === undefined ? FALLBACK_GLYPH : glyphFromRows(rows);
}

/** Les types qui ont un glyphe dédié. */
export function kindsWithGlyph(): readonly PieceKind[] {
  return Object.keys(ROWS_BY_KIND);
}

/** Les pixels allumés d'un glyphe, ligne par ligne, de gauche à droite. */
export function litPixels(glyph: PieceGlyph): readonly GlyphPixel[] {
  const pixels: GlyphPixel[] = [];
  glyph.rows.forEach((line, row) => {
    for (let column = 0; column < line.length; column += 1) {
      if (line[column] === LIT) pixels.push({ column, row });
    }
  });
  return pixels;
}
