import { describe, expect, it } from "vitest";
import { FEAT_IDS, shownFeats, unlockedFeats } from "./catalog.js";
import { statsFrom } from "./stats.js";

describe("statistiques", () => {
  it("compte victoires, défaites et la plus longue série, dans l'ordre des fins", () => {
    const rows = [
      { player_a: "p", winner: "A" },
      { player_a: "q", winner: "B" },
      { player_a: "p", winner: "A" },
      { player_a: "p", winner: "B" },
      { player_a: "q", winner: "B" },
    ];
    expect(statsFrom(rows, "p", 1250)).toEqual({ played: 5, won: 4, lost: 1, bestStreak: 3, rating: 1250 });
  });
});

describe("faits d'armes", () => {
  const blank = { played: 0, won: 0, lost: 0, bestStreak: 0, rating: 1200 };

  it("ne décerne rien à un joueur qui n'a pas joué", () => {
    expect(unlockedFeats(blank)).toEqual([]);
  });

  it("décerne les faits dont le seuil est atteint, dans l'ordre du catalogue", () => {
    expect(unlockedFeats({ ...blank, played: 12, won: 3, bestStreak: 3 })).toEqual(["first-match", "first-win", "matches-10", "streak-3"]);
    expect(unlockedFeats({ played: 99, won: 99, lost: 0, bestStreak: 99, rating: 2000 })).toEqual([...FEAT_IDS]);
  });

  it("n'exhibe que des faits débloqués, sans doublon, trois au plus", () => {
    const unlocked = unlockedFeats({ played: 99, won: 99, lost: 0, bestStreak: 99, rating: 2000 });
    expect(shownFeats(["streak-5", "streak-5", "nope", "first-win", "wins-10", "matches-50"], unlocked)).toEqual([
      "streak-5",
      "first-win",
      "wins-10",
    ]);
    expect(shownFeats(["rating-1400"], ["first-match"])).toEqual([]);
    expect(shownFeats("junk", unlocked)).toEqual([]);
  });
});
