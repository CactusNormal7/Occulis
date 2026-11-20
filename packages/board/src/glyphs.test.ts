import { describe, expect, it } from "vitest";
import { FALLBACK_GLYPH, glyphOf, kindsWithGlyph, litPixels } from "./glyphs.js";

describe("glyphOf", () => {
  it("donne à chaque pièce du roster actuel un glyphe propre", () => {
    for (const kind of ["commander", "scout", "pawn"]) {
      expect(glyphOf(kind)).not.toBe(FALLBACK_GLYPH);
      expect(glyphOf(kind).rows).not.toEqual(FALLBACK_GLYPH.rows);
    }
  });

  it("retombe sur un glyphe visible pour un type inconnu", () => {
    expect(glyphOf("unknown-kind")).toBe(FALLBACK_GLYPH);
    expect(litPixels(FALLBACK_GLYPH).length).toBeGreaterThan(0);
  });

  it("ne contient que des grilles rectangulaires de pixels allumés ou vides", () => {
    for (const kind of kindsWithGlyph()) {
      const glyph = glyphOf(kind);
      for (const row of glyph.rows) {
        expect(row).toHaveLength(glyph.width);
        expect(row).toMatch(/^[#.]+$/);
      }
    }
  });

  it("donne à chaque type une forme distincte", () => {
    const shapes = kindsWithGlyph().map((kind) => glyphOf(kind).rows.join("\n"));
    expect(new Set(shapes).size).toBe(shapes.length);
  });
});

describe("litPixels", () => {
  it("liste les pixels allumés ligne par ligne, de gauche à droite", () => {
    const glyph = { rows: ["#.", ".#"], width: 2, height: 2 };
    expect(litPixels(glyph)).toEqual([
      { column: 0, row: 0 },
      { column: 1, row: 1 },
    ]);
  });
});
