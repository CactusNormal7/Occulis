import { describe, expect, it } from "vitest";
import { type Action, applyAction, isCommanderThreatened, legalActions, validateAction } from "./actions.js";
import { Board } from "./board.js";
import type { Result } from "./result.js";
import { type GameState, createGame, pieceAt } from "./state.js";
import { definePiece, placePiece, testRuleset } from "./testing.js";

const ruleset = testRuleset(
  definePiece("scout", { steps: 2, adjacency: "orthogonal" }),
  definePiece("commander", { steps: 1, adjacency: "orthogonal", isCommander: true }),
);

function unwrap<T>(result: Result<T, unknown>): T {
  if (!result.ok) throw new Error(`action refusée: ${JSON.stringify(result.error)}`);
  return result.value;
}

/** Duel minimal : un scout de chaque camp, plus les deux pièces maîtresses. */
function duel(board = Board.flat(6, 3)): GameState {
  return createGame(board, ruleset, [
    placePiece("a-scout", "scout", "A", 0, 0),
    placePiece("a-cmd", "commander", "A", 0, 2),
    placePiece("b-scout", "scout", "B", 5, 0),
    placePiece("b-cmd", "commander", "B", 5, 2),
  ]);
}

describe("legalActions", () => {
  it("ne propose que les pièces du joueur au trait", () => {
    const actions = legalActions(duel());
    const moved = new Set(actions.map((a) => (a.kind === "move" ? a.pieceId : "")));
    expect(moved).toEqual(new Set(["a-scout", "a-cmd"]));
  });

  it("ne propose pas de passer son tour", () => {
    const state = duel();
    const scout = state.pieces.get("a-scout")!;
    const passing = legalActions(state).filter(
      (a) => a.kind === "move" && a.pieceId === "a-scout" && a.to.x === scout.coord.x && a.to.y === scout.coord.y,
    );
    expect(passing).toEqual([]);
  });

  it("est vide une fois la partie terminée", () => {
    const finished = unwrap(applyAction(duel(), { kind: "resign" }));
    expect(legalActions(finished)).toEqual([]);
  });
});

describe("applyAction — déplacement", () => {
  it("déplace la pièce et rend la main à l'adversaire", () => {
    const before = duel();
    const after = unwrap(applyAction(before, { kind: "move", pieceId: "a-scout", to: { x: 2, y: 0 } }));

    expect(after.pieces.get("a-scout")?.coord).toEqual({ x: 2, y: 0 });
    expect(after.activePlayer).toBe("B");
    expect(after.turn).toBe(1);
    // L'état d'origine n'est jamais muté.
    expect(before.pieces.get("a-scout")?.coord).toEqual({ x: 0, y: 0 });
    expect(before.activePlayer).toBe("A");
  });

  it("refuse une destination hors de portée", () => {
    const result = applyAction(duel(), { kind: "move", pieceId: "a-scout", to: { x: 4, y: 0 } });
    expect(result).toEqual({ ok: false, error: { code: "unreachable", to: { x: 4, y: 0 } } });
  });

  it("refuse de jouer la pièce de l'adversaire", () => {
    const result = applyAction(duel(), { kind: "move", pieceId: "b-scout", to: { x: 4, y: 0 } });
    expect(result).toEqual({ ok: false, error: { code: "not-your-piece", pieceId: "b-scout" } });
  });

  it("refuse une pièce inconnue", () => {
    const result = applyAction(duel(), { kind: "move", pieceId: "fantome", to: { x: 1, y: 0 } });
    expect(result).toEqual({ ok: false, error: { code: "unknown-piece", pieceId: "fantome" } });
  });

  it("refuse une action qui ne fait rien", () => {
    const result = validateAction(duel(), { kind: "move", pieceId: "a-scout", to: { x: 0, y: 0 } });
    expect(result).toEqual({ ok: false, error: { code: "must-do-something" } });
  });
});

describe("applyAction — capture de mêlée", () => {
  const contact = () =>
    createGame(Board.flat(6, 3), ruleset, [
      placePiece("a-scout", "scout", "A", 0, 0),
      placePiece("a-cmd", "commander", "A", 0, 2),
      placePiece("b-scout", "scout", "B", 2, 0),
      placePiece("b-cmd", "commander", "B", 5, 2),
    ]);

  it("capture en se déplaçant au contact, dans la même action", () => {
    const after = unwrap(
      applyAction(contact(), { kind: "move", pieceId: "a-scout", to: { x: 1, y: 0 }, capture: "b-scout" }),
    );
    expect(after.pieces.has("b-scout")).toBe(false);
    expect(after.pieces.get("a-scout")?.coord).toEqual({ x: 1, y: 0 });
    expect(after.turn).toBe(1);
  });

  it("laisse frapper un adjacent sans bouger", () => {
    const adjacent = createGame(Board.flat(6, 3), ruleset, [
      placePiece("a-scout", "scout", "A", 0, 0),
      placePiece("a-cmd", "commander", "A", 0, 2),
      placePiece("b-scout", "scout", "B", 1, 0),
      placePiece("b-cmd", "commander", "B", 5, 2),
    ]);
    const after = unwrap(
      applyAction(adjacent, { kind: "move", pieceId: "a-scout", to: { x: 0, y: 0 }, capture: "b-scout" }),
    );
    expect(after.pieces.has("b-scout")).toBe(false);
    expect(after.pieces.get("a-scout")?.coord).toEqual({ x: 0, y: 0 });
  });

  it("refuse une cible hors de portée de mêlée", () => {
    const result = applyAction(contact(), {
      kind: "move",
      pieceId: "a-scout",
      to: { x: 0, y: 0 },
      capture: "b-scout",
    });
    expect(result).toEqual({ ok: false, error: { code: "target-out-of-melee", targetId: "b-scout" } });
  });

  it("refuse de capturer une pièce alliée", () => {
    const friendly = createGame(Board.flat(6, 3), ruleset, [
      placePiece("a-scout", "scout", "A", 0, 0),
      placePiece("a-cmd", "commander", "A", 1, 0),
      placePiece("b-cmd", "commander", "B", 5, 2),
    ]);
    const result = applyAction(friendly, {
      kind: "move",
      pieceId: "a-scout",
      to: { x: 0, y: 0 },
      capture: "a-cmd",
    });
    expect(result).toEqual({ ok: false, error: { code: "target-is-friendly", targetId: "a-cmd" } });
  });

  it("applique l'asymétrie de hauteur : on frappe vers le bas, pas deux niveaux vers le haut", () => {
    // Le scout de A est au sol, celui de B perché deux niveaux plus haut.
    const board = Board.fromAscii(["03", "00"]);
    const cliff = createGame(board, ruleset, [
      placePiece("a-scout", "scout", "A", 0, 0),
      placePiece("a-cmd", "commander", "A", 0, 1),
      placePiece("b-scout", "scout", "B", 1, 0),
      placePiece("b-cmd", "commander", "B", 1, 1),
    ]);
    const upward: Action = { kind: "move", pieceId: "a-scout", to: { x: 0, y: 0 }, capture: "b-scout" };
    expect(validateAction(cliff, upward).ok).toBe(false);

    const bTurn = { ...cliff, activePlayer: "B" as const };
    const downward: Action = { kind: "move", pieceId: "b-scout", to: { x: 1, y: 0 }, capture: "a-scout" };
    expect(validateAction(bTurn, downward).ok).toBe(true);
  });
});

describe("fin de partie", () => {
  it("déclare la victoire quand la pièce maîtresse est capturée", () => {
    const state = createGame(Board.flat(4, 1), ruleset, [
      placePiece("a-scout", "scout", "A", 0, 0),
      placePiece("a-cmd", "commander", "A", 3, 0),
      placePiece("b-cmd", "commander", "B", 1, 0),
    ]);
    const after = unwrap(
      applyAction(state, { kind: "move", pieceId: "a-scout", to: { x: 0, y: 0 }, capture: "b-cmd" }),
    );
    expect(after.outcome).toEqual({ kind: "victory", winner: "A", reason: "commander-captured" });
  });

  it("donne la victoire à l'adversaire en cas d'abandon", () => {
    const after = unwrap(applyAction(duel(), { kind: "resign" }));
    expect(after.outcome).toEqual({ kind: "victory", winner: "B", reason: "resignation" });
  });

  it("refuse toute action après la fin de partie", () => {
    const finished = unwrap(applyAction(duel(), { kind: "resign" }));
    expect(applyAction(finished, { kind: "resign" })).toEqual({ ok: false, error: { code: "game-over" } });
  });

  it("déclare le pat quand le joueur au trait n'a plus aucun coup", () => {
    // B n'a que sa pièce maîtresse, murée en (4,0) et hors de portée de A.
    const board = Board.fromAscii(["000~0"]);
    const state = createGame(board, ruleset, [
      placePiece("a-cmd", "commander", "A", 0, 0),
      placePiece("b-cmd", "commander", "B", 4, 0),
    ]);
    expect(legalActions(state).length).toBeGreaterThan(0);

    const after = unwrap(applyAction(state, { kind: "move", pieceId: "a-cmd", to: { x: 1, y: 0 } }));
    expect(after.activePlayer).toBe("B");
    expect(after.outcome).toEqual({ kind: "draw", reason: "stalemate" });
  });
});

describe("isCommanderThreatened", () => {
  it("détecte une menace sur la pièce maîtresse", () => {
    const state = createGame(Board.flat(5, 1), ruleset, [
      placePiece("a-cmd", "commander", "A", 0, 0),
      placePiece("b-scout", "scout", "B", 2, 0),
      placePiece("b-cmd", "commander", "B", 4, 0),
    ]);
    expect(isCommanderThreatened(state, "A")).toBe(true);
    expect(isCommanderThreatened(state, "B")).toBe(false);
  });

  it("ne voit pas de menace hors de portée", () => {
    const state = createGame(Board.flat(9, 1), ruleset, [
      placePiece("a-cmd", "commander", "A", 0, 0),
      placePiece("b-scout", "scout", "B", 8, 0),
      placePiece("b-cmd", "commander", "B", 6, 0),
    ]);
    expect(isCommanderThreatened(state, "A")).toBe(false);
  });
});

describe("pieceAt", () => {
  it("retrouve la pièce sur une case, ou rien", () => {
    const state = duel();
    expect(pieceAt(state, { x: 0, y: 0 })?.id).toBe("a-scout");
    expect(pieceAt(state, { x: 3, y: 1 })).toBeUndefined();
  });
});
