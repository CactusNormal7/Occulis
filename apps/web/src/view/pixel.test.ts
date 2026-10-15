import { describe, expect, it } from "vitest";
import { ART_PIXEL, breath, mixColor, pixelResolution, snap } from "./pixel.js";

describe("pixelResolution", () => {
  it("donne au pixel du plateau la même taille physique quel que soit l'écran", () => {
    for (const ratio of [1, 1.25, 1.5, 2, 3]) {
      // Un pixel du tampon couvre 1 / résolution pixels CSS, soit ratio / résolution
      // pixels physiques.
      expect(ratio / pixelResolution(ratio)).toBeCloseTo(ART_PIXEL);
    }
  });

  it("retombe sur un écran ordinaire si le ratio est absurde", () => {
    expect(pixelResolution(0)).toBe(1 / ART_PIXEL);
    expect(pixelResolution(Number.NaN)).toBe(1 / ART_PIXEL);
  });
});

describe("snap", () => {
  it("arrondit à la grille", () => {
    expect(snap(5.2, 2)).toBe(6);
    expect(snap(-3.9, 0.5)).toBe(-4);
  });
});

describe("mixColor", () => {
  // Couleurs construites par décalage : la règle du code couleur interdit tout littéral.
  const rgb = (r: number, g: number, b: number) => (r << 16) | (g << 8) | b;

  it("rend ses extrémités", () => {
    expect(mixColor(rgb(10, 20, 30), rgb(200, 100, 0), 0)).toBe(rgb(10, 20, 30));
    expect(mixColor(rgb(10, 20, 30), rgb(200, 100, 0), 1)).toBe(rgb(200, 100, 0));
  });

  it("mélange canal par canal, et borne t", () => {
    expect(mixColor(rgb(0, 0, 0), rgb(200, 100, 50), 0.5)).toBe(rgb(100, 50, 25));
    expect(mixColor(rgb(0, 0, 0), rgb(200, 100, 50), 3)).toBe(rgb(200, 100, 50));
  });
});

describe("breath", () => {
  it("part de zéro, culmine à mi-période et y revient", () => {
    expect(breath(0, 1000)).toBeCloseTo(0);
    expect(breath(500, 1000)).toBeCloseTo(1);
    expect(breath(1000, 1000)).toBeCloseTo(0);
  });
});
