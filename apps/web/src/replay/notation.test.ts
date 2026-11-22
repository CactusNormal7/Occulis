import { setLocale } from "../locale/current.js";
import { describe, expect, it } from "vitest";
import type { AdminFrame, AdminFramePiece } from "@occulis/protocol";
import type { Action, Outcome, PlayerId } from "@occulis/core";
import { notationOf, pieceLetter, squareName } from "./notation.js";

setLocale("fr");

const piece = (id: string, kind: string, owner: PlayerId, x: number, y: number) =>
  ({ id, kind, owner, x, y }) satisfies AdminFramePiece;
const frame = (...pieces: AdminFramePiece[]): AdminFrame => ({
  pieces,
  traps: [],
  visible: { A: [], B: [] },
});

/** Une carte de 5 × 5 : rangée 1 au sud (y = 4), colonne a à l'ouest. */
const board = Array.from({ length: 25 }, (_, i) => ({
  coord: { x: i % 5, y: Math.floor(i / 5) },
  height: 0,
  passable: true,
}));

function matchOf(actions: [PlayerId, Action][], frames: AdminFrame[], outcome?: Outcome) {
  return {
    log: actions.map(([player, action], seq) => ({ seq, player, action })),
    frames,
    outcome: outcome ?? null,
    board,
  };
}

describe("notation des coups", () => {
  it("nomme les cases depuis le camp A et les pièces d'une lettre", () => {
    expect(squareName({ x: 0, y: 4 }, 5)).toBe("a1");
    expect(squareName({ x: 4, y: 0 }, 5)).toBe("e5");
    expect(["commander", "scout", "trapper", "pawn"].map(pieceLetter)).toEqual([
      "K",
      "S",
      "T",
      "P",
    ]);
  });

  it("note une prise par x et dit la pièce prise", () => {
    const match = matchOf(
      [["A", { kind: "move", pieceId: "a", to: { x: 1, y: 2 } }]],
      [
        frame(piece("a", "scout", "A", 1, 4), piece("b", "pawn", "B", 1, 2)),
        frame(piece("a", "scout", "A", 1, 2)),
      ],
    );
    expect(notationOf(match, 0)).toEqual({
      short: "Sb1xb3",
      detail: "Éclaireur de b1 à b3, prend le pion",
    });
  });

  it("note un piège posé par ^, et la pièce qui y tombe par un ^ final", () => {
    const trapper = piece("t", "trapper", "A", 2, 3);
    const pawn = piece("p", "pawn", "B", 3, 1);
    const match = matchOf(
      [
        ["A", { kind: "ability", pieceId: "t", target: { x: 2, y: 2 } }],
        ["B", { kind: "move", pieceId: "p", to: { x: 2, y: 2 } }],
      ],
      [frame(trapper, pawn), frame(trapper, pawn), frame(trapper)],
    );
    expect(notationOf(match, 0)).toEqual({
      short: "Tc2^c3",
      detail: "Trappeur en c2 pose un piège en c3",
    });
    expect(notationOf(match, 1)).toEqual({
      short: "Pd4-c3^",
      detail: "Pion de d4 à c3, pris au piège",
    });
  });

  it("marque le mat sur le dernier coup", () => {
    const match = matchOf(
      [["B", { kind: "move", pieceId: "k", to: { x: 0, y: 1 } }]],
      [frame(piece("k", "commander", "B", 0, 0)), frame(piece("k", "commander", "B", 0, 1))],
      { kind: "victory", winner: "B", reason: "checkmate" },
    );
    expect(notationOf(match, 0)).toEqual({
      short: "Ka5-a4#",
      detail: "Roi de a5 à a4 : échec et mat",
    });
  });
});
