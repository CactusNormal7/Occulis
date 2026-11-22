import { describe, expect, it } from "vitest";
import { layoutGlyph, partsOf, rectsOf } from "./glyph-layout.js";
import { glyphOf, litPixels } from "./glyphs.js";
import type { IsoProjection } from "./iso.js";
import { look } from "./theme.js";

const PROJECTION: IsoProjection = {
  tileWidth: 72,
  tileHeight: 36,
  heightUnit: 22,
  scale: 1.3,
  rotation: 0,
  pivot: { x: 0, y: 0 },
};

describe("layoutGlyph", () => {
  const pixel = 0.5;
  const base = { x: 100.3, y: 50.7 };
  const glyph = glyphOf("scout");

  it("donne aux pixels du glyphe un côté multiple du pixel du plateau", () => {
    const layout = layoutGlyph(glyph, base, PROJECTION, pixel);
    expect(layout.cell / pixel).toBe(Math.round(layout.cell / pixel));
    expect(layout.cell).toBeGreaterThanOrEqual(pixel);
  });

  it("centre la silhouette sur la case en vue de dessus", () => {
    const pawn = glyphOf("pawn");
    const layout = layoutGlyph(pawn, base, PROJECTION, pixel, 0, 1);
    const rows = litPixels(pawn).map((lit) => lit.row);
    const litTop = layout.top + Math.min(...rows) * layout.cell;
    const litBottom = layout.top + (Math.max(...rows) + 1) * layout.cell;
    expect((litTop + litBottom) / 2).toBeCloseTo(base.y, 0);
    expect(layout.center.x).toBeCloseTo(base.x, 0);
  });

  it("pose le glyphe debout sur la case, centré", () => {
    const layout = layoutGlyph(glyph, base, PROJECTION, pixel);
    expect(layout.top + layout.height).toBeCloseTo(base.y, 0);
    expect(layout.center.x).toBeCloseTo(base.x, 0);
  });

  it("relève le glyphe d'une pièce sélectionnée", () => {
    const resting = layoutGlyph(glyph, base, PROJECTION, pixel);
    const raised = layoutGlyph(glyph, base, PROJECTION, pixel, 6);
    expect(raised.top).toBeCloseTo(resting.top - 6, 0);
  });
});

describe("partsOf", () => {
  it("range les dernières lignes dans le socle et le reste dans le corps", () => {
    const glyph = glyphOf("commander");
    const parts = partsOf(glyph);
    const firstSocleRow = glyph.height - look().pieces.glyph.baseRows;
    expect(parts.body.length + parts.socle.length).toBe(litPixels(glyph).length);
    expect(parts.socle.every((pixel) => pixel.row >= firstSocleRow)).toBe(true);
    expect(parts.body.every((pixel) => pixel.row < firstSocleRow)).toBe(true);
  });
});

describe("rectsOf", () => {
  it("décale l'ombre portée d'une ligne entière", () => {
    const layout = layoutGlyph(glyphOf("pawn"), { x: 0, y: 0 }, PROJECTION, 1);
    const pixels = litPixels(glyphOf("pawn"));
    const [plain] = rectsOf(pixels, layout);
    const [shadow] = rectsOf(pixels, layout, 1);
    expect(shadow?.y).toBe((plain?.y ?? 0) + layout.cell);
  });
});
