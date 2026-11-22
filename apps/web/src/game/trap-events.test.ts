import { describe, expect, it } from "vitest";
import {
  type Action,
  Board,
  type MatchMemory,
  type Piece,
  type PlayerId,
  advanceMemory,
  createGame,
  provisionalRuleset,
  startMemory,
  viewFor,
} from "@occulis/core";
import { trapEventsBetween } from "./trap-events.js";

const PIECES: Piece[] = [
  { id: "a-king", kind: "commander", owner: "A", coord: { x: 0, y: 0 } },
  { id: "a-trap", kind: "trapper", owner: "A", coord: { x: 2, y: 1 } },
  { id: "b-pawn", kind: "pawn", owner: "B", coord: { x: 5, y: 1 } },
  { id: "b-king", kind: "commander", owner: "B", coord: { x: 8, y: 0 } },
];

function play(memory: MatchMemory, action: Action): MatchMemory {
  const next = advanceMemory(memory, action);
  if (!next.ok) throw new Error(JSON.stringify(next.error));
  return next.value;
}

const view = (memory: MatchMemory, player: PlayerId) =>
  viewFor(memory.state, memory.knowledge[player]);

describe("trapEventsBetween", () => {
  const start = startMemory(createGame(Board.flat(9, 3), provisionalRuleset(), PIECES));
  const laid = play(start, { kind: "ability", pieceId: "a-trap", target: { x: 3, y: 1 } });

  it("annonce la pose au poseur, et à l'adversaire seulement le geste", () => {
    expect(trapEventsBetween(view(start, "A"), view(laid, "A"))).toEqual([
      { kind: "laid", coord: { x: 3, y: 1 }, owner: "A" },
    ]);
    expect(trapEventsBetween(view(start, "B"), view(laid, "B"))).toEqual([
      { kind: "glimpsed", coord: { x: 2, y: 1 }, owner: "A" },
    ]);
  });

  it("dit aux deux camps la pièce prise au piège, et d'où elle venait", () => {
    const closer = play(laid, { kind: "move", pieceId: "b-pawn", to: { x: 4, y: 1 } });
    const waited = play(closer, { kind: "move", pieceId: "a-king", to: { x: 0, y: 1 } });
    const sprung = play(waited, { kind: "move", pieceId: "b-pawn", to: { x: 3, y: 1 } });

    const victim = { id: "b-pawn", kind: "pawn", owner: "B", from: { x: 4, y: 1 } };
    for (const player of ["A", "B"] as const) {
      expect(trapEventsBetween(view(waited, player), view(sprung, player))).toEqual([
        { kind: "sprung", coord: { x: 3, y: 1 }, victim },
      ]);
    }
  });

  it("ne dit rien d'un coup ordinaire", () => {
    const moved = play(start, { kind: "move", pieceId: "a-king", to: { x: 1, y: 0 } });
    expect(trapEventsBetween(view(start, "A"), view(moved, "A"))).toEqual([]);
  });
});
