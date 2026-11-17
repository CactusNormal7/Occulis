import { describe, expect, it } from "vitest";
import {
  Board,
  type GameState,
  advanceMemory,
  createGame,
  provisionalRuleset,
  startMemory,
  viewFor,
} from "@occulis/core";
import { inspectPiece, sameSheet } from "./inspection.js";

const ruleset = provisionalRuleset();

/** Un mur en x = 3 : l'éclaireur de B, derrière, n'est vu que par-dessus ou en le contournant. */
const WALLED = Board.fromAscii(["0009000", "0009000", "0000000"]);

function game(board = Board.flat(7, 3)): GameState {
  return createGame(board, ruleset, [
    { id: "a-king", kind: "commander", owner: "A", coord: { x: 0, y: 0 } },
    { id: "a-scout", kind: "scout", owner: "A", coord: { x: 1, y: 2 } },
    { id: "b-scout", kind: "scout", owner: "B", coord: { x: 5, y: 2 } },
    { id: "b-king", kind: "commander", owner: "B", coord: { x: 6, y: 0 } },
  ]);
}

describe("inspectPiece", () => {
  it("lit les caractéristiques dans le ruleset de la partie", () => {
    const state = game();
    const view = viewFor(state, startMemory(state).knowledge.A);

    expect(inspectPiece(view, ruleset, { x: 1, y: 2 })).toEqual({
      piece: { id: "a-scout", kind: "scout", owner: "A", coord: { x: 1, y: 2 } },
      relation: "own",
      role: "special",
      steps: 3,
      adjacency: "octile",
      canClimb: true,
      visionRange: 20,
      lastSeenTurn: undefined,
      inCheck: false,
    });
  });

  it("décrit une pièce adverse visible, sans rien de plus que son type", () => {
    const state = game();
    const view = viewFor(state, startMemory(state).knowledge.A);
    const sheet = inspectPiece(view, ruleset, { x: 5, y: 2 });

    expect(sheet?.relation).toBe("enemy");
    expect(sheet?.steps).toBe(3);
    expect(sheet?.inCheck).toBe(false);
  });

  it("ne rend rien pour une case vide ou une pièce que le joueur ne voit pas", () => {
    const state = game(WALLED);
    const view = viewFor(state, startMemory(state).knowledge.A);

    expect(inspectPiece(view, ruleset, { x: 2, y: 1 })).toBeUndefined();
    // Le roi de B est derrière le mur : sa case est occupée, mais pas pour A.
    expect(view.visibleEnemies.some((piece) => piece.id === "b-king")).toBe(false);
    expect(inspectPiece(view, ruleset, { x: 6, y: 0 })).toBeUndefined();
  });

  it("signale un fantôme avec le tour où il a été vu", () => {
    // L'éclaireur de A voit celui de B par la rangée du bas, puis passe derrière le mur :
    // la case n'est plus en vue, le souvenir reste.
    const hidden = advanceMemoryOrThrow(startMemory(game(WALLED)), "a-scout", 1, 0);
    const view = viewFor(hidden.state, hidden.knowledge.A);
    expect(view.visibleEnemies).toEqual([]);

    expect(inspectPiece(view, ruleset, { x: 5, y: 2 })).toMatchObject({
      relation: "ghost",
      lastSeenTurn: 0,
    });
  });

  it("dit le roi du joueur en échec, et lui seul", () => {
    const state = createGame(Board.flat(7, 3), ruleset, [
      { id: "a-king", kind: "commander", owner: "A", coord: { x: 0, y: 0 } },
      { id: "a-scout", kind: "scout", owner: "A", coord: { x: 0, y: 2 } },
      { id: "b-scout", kind: "scout", owner: "B", coord: { x: 2, y: 0 } },
      { id: "b-king", kind: "commander", owner: "B", coord: { x: 6, y: 2 } },
    ]);
    const view = viewFor(state, startMemory(state).knowledge.A);

    expect(view.check).toBe(true);
    expect(inspectPiece(view, ruleset, { x: 0, y: 0 })?.inCheck).toBe(true);
    expect(inspectPiece(view, ruleset, { x: 0, y: 2 })?.inCheck).toBe(false);
  });
});

describe("sameSheet", () => {
  it("reconnaît la même pièce au même endroit, et rien d'autre", () => {
    const state = game();
    const view = viewFor(state, startMemory(state).knowledge.A);
    const scout = inspectPiece(view, ruleset, { x: 1, y: 2 });
    const king = inspectPiece(view, ruleset, { x: 0, y: 0 });

    expect(sameSheet(scout, inspectPiece(view, ruleset, { x: 1, y: 2 }))).toBe(true);
    expect(sameSheet(scout, king)).toBe(false);
    expect(sameSheet(scout, undefined)).toBe(false);
    expect(sameSheet(undefined, undefined)).toBe(true);
  });
});

function advanceMemoryOrThrow(
  memory: ReturnType<typeof startMemory>,
  pieceId: string,
  x: number,
  y: number,
): ReturnType<typeof startMemory> {
  const advanced = advanceMemory(memory, { kind: "move", pieceId, to: { x, y } });
  if (!advanced.ok) throw new Error(`coup refusé : ${JSON.stringify(advanced.error)}`);
  return advanced.value;
}
