import { describe, expect, it } from "vitest";
import { CLOSE_MS, OPEN_MS, OPEN_SPREAD_MS, cellDelay, closeCell, nearestCorner, openCell } from "./pixel-reveal.js";

describe("cellDelay", () => {
  const topLeft = { right: false, bottom: false };
  const bottomRight = { right: true, bottom: true };

  it("balaie du coin de départ au coin opposé", () => {
    expect(cellDelay(0, 0, 20, 10, topLeft)).toBe(0);
    expect(cellDelay(19, 9, 20, 10, topLeft)).toBe(1);
    expect(cellDelay(19, 9, 20, 10, bottomRight)).toBe(0);
    expect(cellDelay(0, 0, 20, 10, bottomRight)).toBe(1);
  });

  it("fait éclore ensemble les carrés d'une même diagonale, sans désordre", () => {
    expect(cellDelay(3, 1, 20, 10, topLeft)).toBe(cellDelay(1, 3, 20, 10, topLeft));
    expect(cellDelay(5, 2, 20, 10, topLeft)).toBeLessThan(cellDelay(6, 2, 20, 10, topLeft));
  });
});

describe("nearestCorner", () => {
  const bounds = { left: 100, top: 100, width: 200, height: 100 };

  it("part du coin le plus proche de la souris", () => {
    expect(nearestCorner(bounds, { x: 290, y: 190 })).toEqual({ right: true, bottom: true });
    expect(nearestCorner(bounds, { x: 0, y: 0 })).toEqual({ right: false, bottom: false });
    expect(nearestCorner(bounds, { x: 1000, y: 0 })).toEqual({ right: true, bottom: false });
  });

  it("part du coin haut gauche sans souris connue", () => {
    expect(nearestCorner(bounds, undefined)).toEqual({ right: false, bottom: false });
  });
});

describe("openCell", () => {
  it("cache la fenêtre avant l'éclosion, puis la dévoile sous un carré qui s'efface", () => {
    expect(openCell(-1).visible).toBe(false);
    const born = openCell(0);
    expect(born.visible).toBe(true);
    expect(born.alpha).toBe(1);
    expect(openCell(10_000)).toEqual({ visible: true, scale: 1, alpha: 0 });
  });

  it("fait jaillir le carré un peu trop grand avant qu'il se pose", () => {
    const peak = Math.max(...Array.from({ length: 90 }, (_, age) => openCell(age).scale));
    expect(peak).toBeGreaterThan(1);
  });
});

describe("closeCell", () => {
  it("allume le carré sur la fenêtre, puis l'emporte avec elle", () => {
    expect(closeCell(-1)).toEqual({ visible: true, scale: 1, alpha: 0 });
    expect(closeCell(35).alpha).toBeGreaterThan(0);
    expect(closeCell(10_000).visible).toBe(false);
    expect(closeCell(10_000).scale).toBe(0);
  });

  it("referme plus vite qu'il n'ouvre", () => {
    expect(CLOSE_MS).toBeLessThan(OPEN_MS);
    expect(OPEN_MS).toBeGreaterThan(OPEN_SPREAD_MS);
  });
});
