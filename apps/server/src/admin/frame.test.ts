import { describe, expect, it } from "vitest";
import { Board, advanceMemory, createGame, provisionalRuleset, startMemory } from "@occulis/core";
import { frameOf } from "./queries.js";

describe("frameOf", () => {
  it("garde les pièges posés, que le replay doit montrer", () => {
    const start = startMemory(
      createGame(Board.flat(9, 3), provisionalRuleset(), [
        { id: "a-king", kind: "commander", owner: "A", coord: { x: 0, y: 0 } },
        { id: "a-trap", kind: "trapper", owner: "A", coord: { x: 2, y: 1 } },
        { id: "b-king", kind: "commander", owner: "B", coord: { x: 8, y: 0 } },
      ]),
    );
    const laid = advanceMemory(start, {
      kind: "ability",
      pieceId: "a-trap",
      target: { x: 3, y: 1 },
    });
    if (!laid.ok) throw new Error(JSON.stringify(laid.error));

    expect(frameOf(start).traps).toEqual([]);
    expect(frameOf(laid.value).traps).toEqual([{ owner: "A", layer: "a-trap", x: 3, y: 1 }]);
  });
});
