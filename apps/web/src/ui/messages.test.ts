import { describe, expect, it } from "vitest";
import { Board } from "@occulis/core";
import { describeTile } from "./messages.js";

const BOARD = Board.fromAscii(["003", "0~0"]);

describe("describeTile", () => {
  it("donne la coordonnée sous la forme attendue par la saisie de coups", () => {
    expect(describeTile(BOARD.getTile({ x: 1, y: 0 }))).toBe("1,0 · hauteur 0");
  });

  it("rapporte la hauteur du relief", () => {
    expect(describeTile(BOARD.getTile({ x: 2, y: 0 }))).toBe("2,0 · hauteur 3");
  });

  it("signale une case infranchissable", () => {
    expect(describeTile(BOARD.getTile({ x: 1, y: 1 }))).toBe("1,1 · hauteur 0 · infranchissable");
  });

  it("signale un clic hors plateau", () => {
    expect(describeTile(BOARD.getTile({ x: 9, y: 9 }))).toBe("Hors plateau.");
    expect(describeTile(undefined)).toBe("Hors plateau.");
  });

  it("ne divulgue jamais la pièce présente, qui peut être hors LOS", () => {
    // Le relief est public, les pièces non (implementation-notes #10) : la
    // lecture ne doit donc mentionner que du terrain.
    expect(describeTile(BOARD.getTile({ x: 0, y: 0 }))).not.toMatch(/pièce|scout|commander/i);
  });
});
