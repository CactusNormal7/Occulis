import { describe, expect, it } from "vitest";
import { GEOMETRY } from "../theme.js";
import { topColor } from "./matter.js";

const brightness = (color: number) => ((color >> 16) & 255) + ((color >> 8) & 255) + (color & 255);

describe("topColor", () => {
  it("part de la matière du sol et s'éclaircit avec la hauteur", () => {
    expect(topColor(0, true)).toBe(GEOMETRY.top);
    expect(topColor(GEOMETRY.peakHeight, true)).toBe(GEOMETRY.peak);
    expect(brightness(topColor(2, true))).toBeGreaterThan(brightness(topColor(1, true)));
  });

  it("assombrit une case hors de vue sans effacer son relief", () => {
    for (const height of [0, 1, 3]) {
      expect(brightness(topColor(height, false))).toBeLessThan(brightness(topColor(height, true)));
    }
    expect(brightness(topColor(3, false))).toBeGreaterThan(brightness(topColor(0, false)));
  });
});
