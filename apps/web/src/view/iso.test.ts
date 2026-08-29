import { describe, expect, it } from "vitest";
import { Board } from "@occulis/core";
import {
  type IsoProjection,
  QUARTER_TURN,
  cliffQuads,
  compareDepth,
  depthOf,
  lerpAngle,
  snapAngle,
  tileQuad,
} from "./iso.js";

function projection(overrides: Partial<IsoProjection> = {}): IsoProjection {
  return {
    tileWidth: 72,
    tileHeight: 36,
    heightUnit: 22,
    scale: 1,
    rotation: 0,
    pivot: { x: 1, y: 1 },
    ...overrides,
  };
}

const FLAT = Board.fromAscii(["000", "000", "000"]);
const MOUND = Board.fromAscii(["000", "020", "000"]);

describe("tileQuad", () => {
  it("garde le pavage jointif à un angle quelconque", () => {
    // Le bug historique : le losange était construit à décalages fixes, donc
    // seuls les centres tournaient et la grille se déchirait hors des multiples
    // de 90°. Deux cases voisines doivent partager exactement leur arête.
    const proj = projection({ rotation: 0.7, scale: 1.37 });
    const left = tileQuad({ x: 0, y: 0 }, 0, proj);
    const right = tileQuad({ x: 1, y: 0 }, 0, proj);

    expect(right[0]).toEqual(left[1]);
    expect(right[3]).toEqual(left[2]);
  });

  it("partage aussi l'arête entre deux cases superposées en y", () => {
    const proj = projection({ rotation: -2.4, scale: 0.6 });
    const top = tileQuad({ x: 0, y: 0 }, 3, proj);
    const bottom = tileQuad({ x: 0, y: 1 }, 3, proj);

    expect(bottom[0]).toEqual(top[3]);
    expect(bottom[1]).toEqual(top[2]);
  });

  it("suit la hauteur sans déformer la case", () => {
    const proj = projection({ rotation: 0.9 });
    const ground = tileQuad({ x: 2, y: 1 }, 0, proj);
    const raised = tileQuad({ x: 2, y: 1 }, 3, proj);

    for (let i = 0; i < ground.length; i += 1) {
      expect(raised[i]?.x).toBeCloseTo(ground[i]?.x ?? NaN, 10);
      expect((ground[i]?.y ?? NaN) - (raised[i]?.y ?? NaN)).toBeCloseTo(3 * 22, 10);
    }
  });
});

describe("cliffQuads", () => {
  it("n'émet aucune face sur un plateau plat", () => {
    for (const tile of FLAT.allTiles()) {
      expect(cliffQuads(FLAT, tile.coord, tile.height, projection())).toHaveLength(0);
    }
  });

  it("émet une face par arête dominant un voisin plus bas", () => {
    expect(cliffQuads(MOUND, { x: 1, y: 1 }, 2, projection())).toHaveLength(4);
  });

  it("n'émet rien depuis une case dominée par ses voisins", () => {
    expect(cliffQuads(MOUND, { x: 0, y: 1 }, 0, projection())).toHaveLength(0);
  });
});

describe("depthOf", () => {
  it("ordonne du plus lointain au plus proche dans le plan", () => {
    const proj = projection();
    const far = depthOf({ x: 0, y: 0 }, 0, proj);
    const near = depthOf({ x: 2, y: 2 }, 0, proj);

    expect(compareDepth(far, near)).toBeLessThan(0);
  });

  it("dessine les cases basses avant les hautes à profondeur égale", () => {
    const proj = projection();
    const low = depthOf({ x: 1, y: 1 }, 0, proj);
    const high = depthOf({ x: 1, y: 1 }, 3, proj);

    expect(compareDepth(low, high)).toBeLessThan(0);
  });

  it("suit la rotation", () => {
    const proj = projection({ rotation: Math.PI });
    // Un demi-tour échange l'avant et l'arrière du plateau.
    expect(
      compareDepth(depthOf({ x: 0, y: 0 }, 0, proj), depthOf({ x: 2, y: 2 }, 0, proj)),
    ).toBeGreaterThan(0);
  });
});

describe("lerpAngle", () => {
  it("prend le chemin le plus court par-dessus le tour complet", () => {
    expect(lerpAngle(0, Math.PI * 2 - 0.2, 1)).toBeCloseTo(-0.2, 10);
  });

  it("interpole linéairement à mi-course", () => {
    expect(lerpAngle(0, 1, 0.5)).toBeCloseTo(0.5, 10);
  });
});

describe("snapAngle", () => {
  it("arrondit au quart de tour le plus proche", () => {
    expect(snapAngle(0.4)).toBeCloseTo(0, 10);
    expect(snapAngle(1.3)).toBeCloseTo(QUARTER_TURN, 10);
    expect(snapAngle(-1.3)).toBeCloseTo(-QUARTER_TURN, 10);
    expect(snapAngle(QUARTER_TURN)).toBeCloseTo(QUARTER_TURN, 10);
  });
});
