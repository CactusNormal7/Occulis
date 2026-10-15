import { describe, expect, it } from "vitest";
import { look } from "../theme.js";
import { topColor } from "./matter.js";

const brightness = (color: number) => ((color >> 16) & 255) + ((color >> 8) & 255) + (color & 255);

describe("topColor", () => {
  const { top, peak, peakHeight } = look().geometry;

  it("part de la matière du sol et s'éclaircit avec la hauteur", () => {
    expect(topColor(0, 1)).toBe(top);
    expect(topColor(peakHeight, 1)).toBe(peak);
    expect(brightness(topColor(2, 1))).toBeGreaterThan(brightness(topColor(1, 1)));
  });

  it("assombrit une case hors de vue sans effacer son relief", () => {
    for (const height of [0, 1, 3]) {
      expect(brightness(topColor(height, 0))).toBeLessThan(brightness(topColor(height, 1)));
    }
    expect(brightness(topColor(3, 0))).toBeGreaterThan(brightness(topColor(0, 0)));
  });

  it("passe continûment de l'ombre à la lumière", () => {
    const half = brightness(topColor(1, 0.5));
    expect(half).toBeGreaterThan(brightness(topColor(1, 0)));
    expect(half).toBeLessThan(brightness(topColor(1, 1)));
  });
});
