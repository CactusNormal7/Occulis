import { describe, expect, it } from "vitest";
import {
  Board,
  createGame,
  legalActions,
  provisionalRuleset,
  startMemory,
  viewFor,
} from "@occulis/core";
import { hypothesisFrom } from "./hypothesis.js";

/** Un mur de hauteur 3 sur la colonne 7 : aucun camp ne voit l'autre au départ. */
const WALLED = Array.from({ length: 14 }, () => "0000000" + "3" + "000000");

function memory() {
  return startMemory(
    createGame(Board.fromAscii(WALLED), provisionalRuleset(), [
      { id: "a-scout", kind: "scout", owner: "A", coord: { x: 0, y: 0 } },
      { id: "a-cmd", kind: "commander", owner: "A", coord: { x: 0, y: 13 } },
      { id: "b-scout", kind: "scout", owner: "B", coord: { x: 13, y: 0 } },
      { id: "b-cmd", kind: "commander", owner: "B", coord: { x: 13, y: 13 } },
    ]),
  );
}

describe("hypothesisFrom", () => {
  it("ne contient que ce que le joueur voit", () => {
    const { state, knowledge } = memory();
    const hypothesis = hypothesisFrom(viewFor(state, knowledge.A), state.board, state.ruleset);

    expect([...hypothesis.pieces.keys()].sort()).toEqual(["a-cmd", "a-scout"]);
    expect(hypothesis.activePlayer).toBe("A");
    expect(hypothesis.turn).toBe(state.turn);
  });

  it("propose un sur-ensemble des coups que le serveur accepte", () => {
    // Le client ignore les pièces hors LOS : il croit libres des cases occupées et
    // ne voit pas les menaces cachées. Il ne doit jamais escamoter un coup légal —
    // c'est le serveur qui refuse, pas l'interface qui devine.
    const { state, knowledge } = memory();
    const hypothesis = hypothesisFrom(viewFor(state, knowledge.A), state.board, state.ruleset);

    const proposed = new Set(legalActions(hypothesis).map((action) => JSON.stringify(action)));
    for (const real of legalActions(state)) {
      expect(proposed.has(JSON.stringify(real))).toBe(true);
    }
  });

  it("reporte la fin de partie annoncée par la vue", () => {
    const { state, knowledge } = memory();
    const view = viewFor(state, knowledge.A);
    const over = {
      ...view,
      outcome: { kind: "victory", winner: "B", reason: "resignation" } as const,
    };

    expect(hypothesisFrom(over, state.board, state.ruleset).outcome).toEqual(over.outcome);
    expect(legalActions(hypothesisFrom(over, state.board, state.ruleset))).toEqual([]);
  });
});
