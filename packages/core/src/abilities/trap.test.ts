import { describe, expect, it } from "vitest";
import { type Action, applyAction, legalActions } from "../actions.js";
import { Board } from "../board.js";
import { startMemory, advanceMemory, viewFor, type MatchMemory } from "../fog.js";
import type { Piece } from "../pieces/index.js";
import { type GameState, createGame } from "../state.js";
import { chessRuleset, definePiece, placePiece } from "../testing.js";

/**
 * Le piège (docs/design/rules.md section 4). Les pièces de test ont une portée d'un pas
 * pour que chaque coup soit lisible ; le trappeur est le seul à avoir la capacité.
 */
const ruleset = chessRuleset([
  definePiece("king", { isCommander: true }),
  definePiece("trapper", { ability: "trap" }),
  definePiece("pawn"),
]);

function game(pieces: Piece[], map: readonly string[] = ["0000000", "0000000", "0000000"]) {
  return createGame(Board.fromAscii(map), ruleset, pieces);
}

function play(state: GameState, action: Action): GameState {
  const result = applyAction(state, action);
  if (!result.ok) throw new Error(`coup refusé : ${JSON.stringify(result.error)}`);
  return result.value;
}

const lay = (pieceId: string, x: number, y: number): Action => ({
  kind: "ability",
  pieceId,
  target: { x, y },
});
const move = (pieceId: string, x: number, y: number): Action => ({
  kind: "move",
  pieceId,
  to: { x, y },
});

const trapsOf = (state: GameState, pieceId: string) =>
  legalActions(state).filter((action) => action.kind === "ability" && action.pieceId === pieceId);

describe("pose d'un piège", () => {
  it("se fait sur une case voisine libre, à la place d'un déplacement", () => {
    const state = game([
      placePiece("a-trap", "trapper", "A", 1, 1),
      placePiece("a-pawn", "pawn", "A", 2, 1),
      placePiece("b-pawn", "pawn", "B", 6, 1),
    ]);
    const targets = trapsOf(state, "a-trap");
    // Huit voisines, moins celle du pion allié.
    expect(targets).toHaveLength(7);

    const laid = play(state, lay("a-trap", 0, 0));
    expect(laid.traps).toEqual([{ owner: "A", layer: "a-trap", coord: { x: 0, y: 0 } }]);
    expect(laid.pieces.get("a-trap")?.coord).toEqual({ x: 1, y: 1 });
    expect(laid.activePlayer).toBe("B");
  });

  it("n'est pas offerte à une pièce sans capacité", () => {
    const state = game([
      placePiece("a-pawn", "pawn", "A", 1, 1),
      placePiece("b-pawn", "pawn", "B", 6, 1),
    ]);
    expect(trapsOf(state, "a-pawn")).toEqual([]);
    expect(applyAction(state, lay("a-pawn", 0, 0))).toEqual({
      ok: false,
      error: { code: "invalid-target", target: { x: 0, y: 0 } },
    });
  });

  it("refuse une case plus haute ou trop loin", () => {
    const state = game(
      [placePiece("a-trap", "trapper", "A", 1, 1), placePiece("b-pawn", "pawn", "B", 6, 1)],
      ["0100000", "0000000", "0000000"],
    );
    expect(applyAction(state, lay("a-trap", 1, 0)).ok).toBe(false);
    expect(applyAction(state, lay("a-trap", 3, 1)).ok).toBe(false);
  });

  it("ne laisse qu'un piège actif par poseur", () => {
    let state = game([
      placePiece("a-trap", "trapper", "A", 1, 1),
      placePiece("b-pawn", "pawn", "B", 6, 1),
    ]);
    state = play(state, lay("a-trap", 0, 0));
    state = play(state, move("b-pawn", 6, 2));
    expect(trapsOf(state, "a-trap")).toEqual([]);
  });
});

describe("déclenchement", () => {
  /**
   * A pose en (3, 1) ; B s'approche en (4, 1) ; le trappeur recule, pour que la case ne
   * soit plus menacée — un roi n'y entrerait pas sinon ; B entre.
   */
  function sprung(victim: "pawn" | "king"): GameState {
    let state = game([
      placePiece("a-king", "king", "A", 0, 2),
      placePiece("a-trap", "trapper", "A", 2, 1),
      placePiece("b-victim", victim, "B", 5, 1),
      ...(victim === "pawn" ? [placePiece("b-king", "king", "B", 6, 2)] : []),
    ]);
    state = play(state, lay("a-trap", 3, 1));
    state = play(state, move("b-victim", 4, 1));
    state = play(state, move("a-trap", 1, 1));
    return play(state, move("b-victim", 3, 1));
  }

  it("prend la pièce adverse qui finit sur le piège, et disparaît", () => {
    const state = sprung("pawn");
    expect(state.pieces.has("b-victim")).toBe(false);
    expect(state.traps).toEqual([]);
    expect(state.history.at(-1)?.trapped?.id).toBe("b-victim");
    expect(state.draw.sinceCapture).toBe(0);
    expect(state.outcome).toBeNull();
  });

  it("donne la partie au poseur quand c'est le roi", () => {
    expect(sprung("king").outcome).toEqual({ kind: "victory", winner: "A", reason: "trap" });
  });

  it("ne frappe jamais une pièce de son camp", () => {
    let state = game([
      placePiece("a-trap", "trapper", "A", 1, 1),
      placePiece("a-pawn", "pawn", "A", 3, 0),
      placePiece("b-pawn", "pawn", "B", 6, 1),
    ]);
    state = play(state, lay("a-trap", 2, 0));
    state = play(state, move("b-pawn", 6, 2));
    state = play(state, move("a-pawn", 2, 0));
    expect(state.pieces.has("a-pawn")).toBe(true);
    expect(state.traps).toHaveLength(1);
  });
});

describe("fog", () => {
  function remember(pieces: Piece[], actions: Action[]): MatchMemory {
    let memory = startMemory(game(pieces));
    for (const action of actions) {
      const next = advanceMemory(memory, action);
      if (!next.ok) throw new Error(JSON.stringify(next.error));
      memory = next.value;
    }
    return memory;
  }

  it("ne montre un piège qu'à son poseur, jamais sa case à l'adversaire", () => {
    const memory = remember(
      [placePiece("a-trap", "trapper", "A", 1, 1), placePiece("b-pawn", "pawn", "B", 5, 1)],
      [lay("a-trap", 2, 1)],
    );
    const own = viewFor(memory.state, memory.knowledge.A);
    const enemy = viewFor(memory.state, memory.knowledge.B);
    expect(own.traps).toHaveLength(1);
    expect(enemy.traps).toEqual([]);
    // B voyait le trappeur : il sait qu'une capacité a servi, pas où.
    const seen = enemy.journal.at(-1);
    expect(seen).toMatchObject({ kind: "trapper", ability: "trap" });
    expect(seen?.target).toBeUndefined();
    expect(own.journal.at(-1)?.target).toEqual({ x: 2, y: 1 });
  });

  it("laisse entrer sur un piège caché : la liste des coups ne le trahit pas", () => {
    const memory = remember(
      [placePiece("a-trap", "trapper", "A", 1, 1), placePiece("b-pawn", "pawn", "B", 3, 1)],
      [lay("a-trap", 2, 1)],
    );
    const legal = viewFor(memory.state, memory.knowledge.B).legalActions;
    expect(legal).toContainEqual(move("b-pawn", 2, 1));
  });

  it("révèle le piège aux deux camps quand il se déclenche, pertes comprises", () => {
    const memory = remember(
      [
        placePiece("a-trap", "trapper", "A", 1, 1),
        placePiece("a-pawn", "pawn", "A", 0, 2),
        placePiece("b-pawn", "pawn", "B", 3, 1),
      ],
      [lay("a-trap", 2, 1), move("b-pawn", 2, 1)],
    );
    for (const player of ["A", "B"] as const) {
      const view = viewFor(memory.state, memory.knowledge[player]);
      expect(view.journal.at(-1)).toMatchObject({ to: { x: 2, y: 1 }, trapped: "pawn" });
    }
    const loser = viewFor(memory.state, memory.knowledge.B);
    expect(loser.rosters.own).toEqual([{ kind: "pawn", taken: true }]);
  });
});
