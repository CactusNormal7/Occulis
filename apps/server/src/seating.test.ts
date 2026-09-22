import { describe, expect, it } from "vitest";
import { type Seats, denyOutOfTurn, seatFor } from "./seating.js";

const SEATS: Seats = { A: "jeton-a", B: "jeton-b" };

describe("seatFor", () => {
  it("rend le camp du jeton présenté", () => {
    expect(seatFor(SEATS, "jeton-a")).toBe("A");
    expect(seatFor(SEATS, "jeton-b")).toBe("B");
  });

  it("refuse un jeton inconnu, absent ou vide", () => {
    // La garantie centrale : sans jeton, on n'obtient la vue d'aucun camp. Le fog of
    // war est structurel, il ne repose pas sur la discrétion du client.
    expect(seatFor(SEATS, "jeton-c")).toBeUndefined();
    expect(seatFor(SEATS, null)).toBeUndefined();
    expect(seatFor(SEATS, "")).toBeUndefined();
  });

  it("ne se laisse pas prendre pour le nom du camp", () => {
    expect(seatFor(SEATS, "A")).toBeUndefined();
    expect(seatFor(SEATS, "B")).toBeUndefined();
  });
});

describe("denyOutOfTurn", () => {
  it("laisse agir le joueur au trait", () => {
    expect(denyOutOfTurn("A", "A")).toBeUndefined();
  });

  it("refuse le joueur qui n'est pas au trait", () => {
    // `core` vérifie que la pièce appartient au joueur au trait, pas que l'expéditeur
    // est ce joueur : sans ce refus, B jouerait les pièces de A.
    expect(denyOutOfTurn("A", "B")).toEqual({ code: "not-your-turn", activePlayer: "A" });
  });
});
