import { describe, expect, it } from "vitest";
import { expectedScore, ratingChanges } from "./rating.js";

describe("Elo", () => {
  it("prédit une chance sur deux à Elo égal", () => {
    expect(expectedScore(1200, 1200)).toBe(0.5);
  });

  it("donne la moitié de K au vainqueur d'un duel égal, et la retire au vaincu", () => {
    expect(ratingChanges(1200, 1200, 1)).toEqual({ a: 16, b: -16 });
    expect(ratingChanges(1200, 1200, 0)).toEqual({ a: -16, b: 16 });
  });

  it("récompense davantage la victoire du moins bien classé", () => {
    const upset = ratingChanges(1000, 1400, 1);
    const expected = ratingChanges(1400, 1000, 1);
    expect(upset.a).toBeGreaterThan(expected.a);
    expect(upset.a + upset.b).toBe(0);
  });
});
