import { describe, expect, it } from "vitest";
import { Board } from "./board.js";
import { coordKey } from "./coord.js";
import { hasLineOfSight, rasterizeLine, visibleFrom } from "./los.js";

describe("rasterizeLine", () => {
  it("inclut les deux extrémités", () => {
    const path = rasterizeLine({ x: 0, y: 0 }, { x: 3, y: 0 });
    expect(path).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ]);
  });

  it("est symétrique en nombre de cases traversées", () => {
    const forward = rasterizeLine({ x: 0, y: 0 }, { x: 4, y: 3 });
    const backward = rasterizeLine({ x: 4, y: 3 }, { x: 0, y: 0 });
    expect(forward.length).toBe(backward.length);
  });
});

describe("hasLineOfSight", () => {
  it("traverse un terrain plat sans obstacle", () => {
    const board = Board.flat(10, 10);
    expect(hasLineOfSight(board, { x: 0, y: 0 }, { x: 9, y: 0 })).toBe(true);
  });

  it("est bloquée par un mur, même de hauteur 1, entre deux pièces au sol", () => {
    const board = Board.fromAscii(["010"]);
    expect(hasLineOfSight(board, { x: 0, y: 0 }, { x: 2, y: 0 })).toBe(false);
  });

  it("laisse voir par-dessus un obstacle plus bas que les deux extrémités", () => {
    const board = Board.fromAscii(["515"]);
    expect(hasLineOfSight(board, { x: 0, y: 0 }, { x: 2, y: 0 })).toBe(true);
  });

  it("grimper sur le mur rend visible ce qu'il cachait", () => {
    const belowWall = Board.fromAscii(["0300"]);
    expect(hasLineOfSight(belowWall, { x: 0, y: 0 }, { x: 3, y: 0 })).toBe(false);
    // La même vue, prise depuis le sommet du mur.
    expect(hasLineOfSight(belowWall, { x: 1, y: 0 }, { x: 3, y: 0 })).toBe(true);
  });

  it("reste bloquée par un second mur, même depuis une hauteur", () => {
    const board = Board.fromAscii(["3090"]);
    expect(hasLineOfSight(board, { x: 0, y: 0 }, { x: 3, y: 0 })).toBe(false);
  });

  it("ne considère pas un trou dans la carte comme un obstacle", () => {
    const board = Board.fromAscii(["0.0"]);
    expect(hasLineOfSight(board, { x: 0, y: 0 }, { x: 2, y: 0 })).toBe(true);
  });

  it("ne voit pas une case hors-carte", () => {
    const board = Board.flat(3, 3);
    expect(hasLineOfSight(board, { x: 0, y: 0 }, { x: 5, y: 5 })).toBe(false);
  });

  it("est réflexive et symétrique", () => {
    const board = Board.fromAscii(["0300", "0100", "0000"]);
    expect(hasLineOfSight(board, { x: 0, y: 0 }, { x: 0, y: 0 })).toBe(true);
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 3; y++) {
        const a = { x: 0, y: 0 };
        const b = { x, y };
        expect(hasLineOfSight(board, a, b)).toBe(hasLineOfSight(board, b, a));
      }
    }
  });
});

describe("visibleFrom", () => {
  it("voit tout un plateau plat sans limite de portée", () => {
    const board = Board.flat(4, 4);
    expect(visibleFrom(board, { x: 0, y: 0 }).size).toBe(16);
  });

  it("borne la vision à la portée, sans que la hauteur ne l'étende", () => {
    const flat = Board.flat(9, 1);
    const elevated = Board.fromAscii(["500000000"]);
    const origin = { x: 0, y: 0 };
    expect(visibleFrom(flat, origin, 2).size).toBe(3);
    expect(visibleFrom(elevated, origin, 2).size).toBe(3);
  });

  it("exclut les cases occultées", () => {
    const board = Board.fromAscii(["0900"]);
    const visible = visibleFrom(board, { x: 0, y: 0 });
    expect(visible.has(coordKey({ x: 1, y: 0 }))).toBe(true);
    expect(visible.has(coordKey({ x: 2, y: 0 }))).toBe(false);
    expect(visible.has(coordKey({ x: 3, y: 0 }))).toBe(false);
  });
});
