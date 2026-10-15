import { describe, expect, it } from "vitest";
import { createMotes, moteAt } from "./ambient.js";

describe("createMotes", () => {
  it("redonne la même nuée pour la même graine", () => {
    expect(createMotes(8, 7)).toEqual(createMotes(8, 7));
    expect(createMotes(8, 7)).not.toEqual(createMotes(8, 8));
  });
});

describe("moteAt", () => {
  const [mote] = createMotes(1, 3);
  if (mote === undefined) throw new Error("une poussière attendue");

  it("reste dans l'écran et monte avec le temps", () => {
    for (const time of [0, 1000, 60_000, 3_600_000]) {
      const at = moteAt(mote, time, 800, 600);
      expect(at.y).toBeGreaterThanOrEqual(0);
      expect(at.y).toBeLessThan(600);
      expect(at.alpha).toBeGreaterThanOrEqual(0);
      expect(at.alpha).toBeLessThanOrEqual(1);
    }
    const start = moteAt(mote, 0, 800, 600);
    const later = moteAt(mote, 100, 800, 600);
    if (start.y > 10) expect(later.y).toBeLessThan(start.y);
  });

  it("varie continûment : aucun saut d'une image à la suivante", () => {
    let previous = moteAt(mote, 0, 800, 600);
    for (let time = 16; time < 5000; time += 16) {
      const at = moteAt(mote, time, 800, 600);
      // Hors du retour par le bas, une image ne déplace pas une poussière d'un pixel entier.
      if (Math.abs(at.y - previous.y) < 300) expect(Math.abs(at.y - previous.y)).toBeLessThan(1);
      previous = at;
    }
  });
});
