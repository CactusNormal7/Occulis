import { describe, expect, it } from "vitest";
import {
  cascadeOf,
  introLength,
  introOf,
  landingAt,
  materializeAt,
  sparksOf,
  trapLayingAt,
  trapSpringAt,
} from "./effects.js";
import { easeOutBack, easeOutCubic, phase } from "./easing.js";

const intro = { introMs: 600, introSpreadMs: 600, introDepth: 2 };

describe("courbes", () => {
  it("partent de 0 et arrivent à 1", () => {
    for (const ease of [easeOutCubic, (t: number) => easeOutBack(t)]) {
      expect(ease(0)).toBeCloseTo(0);
      expect(ease(1)).toBeCloseTo(1);
    }
    expect(phase(50, 0, 100)).toBe(0.5);
    expect(phase(500, 0, 0)).toBe(1);
  });
});

describe("introOf", () => {
  it("monte les cases du fond d'abord, et les pose toutes à leur place", () => {
    expect(introOf(0, 300, intro).drop).toBeLessThan(introOf(1, 300, intro).drop);
    for (const rank of [0, 0.5, 1]) {
      expect(introOf(rank, introLength(intro), intro).drop).toBeCloseTo(0);
      expect(introOf(rank, introLength(intro), intro).alpha).toBe(1);
    }
  });
});

describe("cascadeOf", () => {
  it("ouvre les destinations voisines avant les lointaines", () => {
    expect(cascadeOf(1, 100, 40, 260)).toBeGreaterThan(cascadeOf(5, 100, 40, 260));
    expect(cascadeOf(5, 10_000, 40, 260)).toBeCloseTo(1);
  });
});

describe("retombée et matérialisation", () => {
  it("s'achèvent, puis disparaissent", () => {
    const landing = { coord: { x: 0, y: 0 }, height: 0, color: 0, start: 100 };
    expect(landingAt(landing, 50, 600)).toBeUndefined();
    expect(landingAt(landing, 300, 600)?.ringAlpha).toBeGreaterThan(0);
    expect(landingAt(landing, 700, 600)).toBeUndefined();
    expect(materializeAt(0, 1000, 500)).toEqual({ alpha: 1, drop: 0, flash: 0 });
  });

  it("répartit les étincelles en couronne, de façon reproductible", () => {
    expect(sparksOf(6, 3)).toEqual(sparksOf(6, 3));
    expect(sparksOf(6, 3)).toHaveLength(6);
  });
});

describe("effets du piège", () => {
  it("pose le sceau de plus grand que la case jusqu'à sa taille, puis s'arrête", () => {
    const early = trapLayingAt(10, 600);
    const late = trapLayingAt(590, 600);
    expect(early?.scale).toBeGreaterThan(1.3);
    expect(late?.scale).toBeCloseTo(1, 1);
    expect(trapLayingAt(600, 600)).toBeUndefined();
  });

  it("referme les mâchoires avant de dissoudre la pièce", () => {
    const shut = trapSpringAt(260, 1400);
    expect(shut?.jaws).toBeGreaterThan(0.95);
    expect(shut?.victimAlpha).toBeCloseTo(1, 1);
    const gone = trapSpringAt(900, 1400);
    expect(gone?.victimAlpha).toBe(0);
    expect(gone?.scar).toBeGreaterThan(0);
    expect(trapSpringAt(1400, 1400)).toBeUndefined();
  });
});
