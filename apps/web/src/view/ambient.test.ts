import { describe, expect, it } from "vitest";
import {
  constellationsOf,
  createMotes,
  createStars,
  fireflyAt,
  moteAt,
  shootingStarAt,
  starAlpha,
} from "./ambient.js";

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

describe("la voûte", () => {
  const stars = createStars(80, 11);

  it("scintille sans dépasser l'éclat propre d'une étoile", () => {
    for (const star of stars.slice(0, 5)) {
      for (const time of [0, 500, 1234])
        expect(starAlpha(star, time)).toBeLessThanOrEqual(star.alpha);
    }
  });

  it("relie des étoiles vives, sans doublon", () => {
    const links = constellationsOf(stars, 0.3);
    const seen = new Set(links.map(([a, b]) => [Math.min(a, b), Math.max(a, b)].join("-")));
    expect(seen.size).toBe(links.length);
    for (const [a, b] of links) {
      expect(stars[a]?.alpha).toBeGreaterThan(0.35);
      expect(stars[b]?.alpha).toBeGreaterThan(0.35);
    }
  });

  it("fait passer une étoile filante de temps en temps, jamais en permanence", () => {
    let shown = 0;
    for (let time = 0; time < 60_000; time += 50)
      if (shootingStarAt(time, 800, 600, 6000, 5) !== undefined) shown += 1;
    expect(shown).toBeGreaterThan(0);
    expect(shown).toBeLessThan(1200 / 3);
  });

  it("garde les lucioles dans l'écran", () => {
    for (const mote of createMotes(10, 2)) {
      const at = fireflyAt(mote, 12_345, 800, 600);
      expect(at.x).toBeGreaterThanOrEqual(0);
      expect(at.x).toBeLessThan(800);
      expect(at.alpha).toBeGreaterThanOrEqual(0);
    }
  });
});
