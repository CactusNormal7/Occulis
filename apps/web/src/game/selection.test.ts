import { describe, expect, it } from "vitest";
import {
  Board,
  type GameState,
  type Piece,
  applyAction,
  coordKey,
  createGame,
  legalActions,
  provisionalRulesetV4,
} from "@occulis/core";
import { aimAbility, resolveClick, selectionFor } from "./selection.js";

/** Assez grand pour que chaque pièce ait de la place autour d'elle. */
const BOARD = Board.flat(14, 14);

const PIECES: readonly Piece[] = [
  { id: "a-scout", kind: "scout", owner: "A", coord: { x: 0, y: 0 } },
  { id: "a-cmd", kind: "commander", owner: "A", coord: { x: 0, y: 13 } },
  { id: "b-scout", kind: "scout", owner: "B", coord: { x: 1, y: 0 } },
  { id: "b-cmd", kind: "commander", owner: "B", coord: { x: 13, y: 13 } },
];

function game(): GameState {
  return createGame(BOARD, provisionalRulesetV4(), [...PIECES]);
}

function pieceOf(state: GameState, id: string): Piece {
  const piece = state.pieces.get(id);
  if (piece === undefined) throw new Error(`pièce ${id} absente du scénario`);
  return piece;
}

describe("selectionFor", () => {
  it("ne propose que des coups que core accepte", () => {
    // La garantie centrale : la sélection filtre `legalActions`, elle ne redéduit
    // rien. Tout ce qu'elle affiche doit donc être applicable.
    const state = game();
    const selection = selectionFor(legalActions(state), pieceOf(state, "a-scout"));

    expect(selection.moves.size).toBeGreaterThan(0);
    for (const to of selection.moves.values()) {
      expect(applyAction(state, { kind: "move", pieceId: "a-scout", to }).ok).toBe(true);
    }
  });

  it("exclut les cases de ses propres pièces", () => {
    const state = game();
    const selection = selectionFor(legalActions(state), pieceOf(state, "a-scout"));

    for (const occupied of PIECES.filter((piece) => piece.owner === "A")) {
      expect(selection.moves.has(coordKey(occupied.coord))).toBe(false);
    }
  });

  it("marque comme prise la case d'une pièce adverse à portée, et elle seule", () => {
    // b-scout est en (1,0), à un pas : y aller, c'est le prendre.
    const state = game();
    const selection = selectionFor(
      legalActions(state),
      pieceOf(state, "a-scout"),
      state.pieces.values(),
    );

    expect(selection.moves.has(coordKey({ x: 1, y: 0 }))).toBe(true);
    expect([...selection.captures]).toEqual([coordKey({ x: 1, y: 0 })]);
  });

  it("ne marque aucune prise quand les pièces adverses ne lui sont pas données", () => {
    const state = game();
    const selection = selectionFor(legalActions(state), pieceOf(state, "a-scout"));
    expect(selection.captures.size).toBe(0);
  });
});

describe("resolveClick", () => {
  it("sélectionne une pièce du joueur au trait", () => {
    const outcome = resolveClick(legalActions(game()), game(), undefined, { x: 0, y: 0 });

    expect(outcome.kind).toBe("select");
    if (outcome.kind === "select") expect(outcome.selection.piece.id).toBe("a-scout");
  });

  it("ignore une pièce adverse et une case vide", () => {
    expect(resolveClick(legalActions(game()), game(), undefined, { x: 1, y: 0 }).kind).toBe(
      "clear",
    );
    expect(resolveClick(legalActions(game()), game(), undefined, { x: 3, y: 2 }).kind).toBe(
      "clear",
    );
  });

  it("ignore un clic hors plateau", () => {
    expect(resolveClick(legalActions(game()), game(), undefined, undefined).kind).toBe("clear");
  });

  it("joue le déplacement quand la case cliquée est une destination", () => {
    const state = game();
    const selection = selectionFor(legalActions(state), pieceOf(state, "a-scout"));
    const to = { x: 2, y: 2 };
    expect(selection.moves.has(coordKey(to))).toBe(true);

    const outcome = resolveClick(legalActions(state), state, selection, to);

    expect(outcome).toEqual({
      kind: "play",
      action: { kind: "move", pieceId: "a-scout", to },
    });
  });

  it("joue la prise sur un clic vers une pièce adverse à portée", () => {
    // La case adverse est une destination : le clic la joue au lieu de retomber sur la
    // règle générale, qui ne sélectionne jamais une pièce d'en face.
    const state = game();
    const selection = selectionFor(legalActions(state), pieceOf(state, "a-scout"));

    expect(resolveClick(legalActions(state), state, selection, { x: 1, y: 0 })).toEqual({
      kind: "play",
      action: { kind: "move", pieceId: "a-scout", to: { x: 1, y: 0 } },
    });
  });

  it("désélectionne quand on reclique la pièce sélectionnée", () => {
    const state = game();
    const selection = selectionFor(legalActions(state), pieceOf(state, "a-scout"));

    expect(resolveClick(legalActions(state), state, selection, { x: 0, y: 0 }).kind).toBe("clear");
  });

  it("change de pièce quand on clique une autre des siennes", () => {
    const state = game();
    const selection = selectionFor(legalActions(state), pieceOf(state, "a-scout"));

    const outcome = resolveClick(legalActions(state), state, selection, { x: 0, y: 13 });

    expect(outcome.kind).toBe("select");
    if (outcome.kind === "select") expect(outcome.selection.piece.id).toBe("a-cmd");
  });

  it("ne sélectionne plus rien une fois la partie terminée", () => {
    const resigned = applyAction(game(), { kind: "resign" });
    expect(resigned.ok).toBe(true);
    if (!resigned.ok) return;

    // (0,0) porte une pièce du joueur encore au trait : sans le garde-fou sur
    // l'issue, le clic la sélectionnerait.
    expect(resigned.value.activePlayer).toBe("A");
    expect(
      resolveClick(legalActions(resigned.value), resigned.value, undefined, { x: 0, y: 0 }).kind,
    ).toBe("clear");
  });
});

describe("capacité : le piège", () => {
  const TRAPPER: Piece = { id: "a-trap", kind: "trapper", owner: "A", coord: { x: 5, y: 5 } };

  function withTrapper(): GameState {
    return createGame(BOARD, provisionalRulesetV4(), [...PIECES, TRAPPER]);
  }

  it("relève les cibles de la capacité, sans les mêler aux déplacements", () => {
    const state = withTrapper();
    const selection = selectionFor(legalActions(state), pieceOf(state, "a-trap"));
    expect(selection.abilityTargets.size).toBe(8);
    expect(selection.aiming).toBe(false);
    expect(selectionFor(legalActions(state), pieceOf(state, "a-scout")).abilityTargets.size).toBe(
      0,
    );
  });

  it("déplace la pièce tant que la capacité n'est pas armée, pose le piège une fois armée", () => {
    const state = withTrapper();
    const selection = selectionFor(legalActions(state), pieceOf(state, "a-trap"));
    const target = { x: 6, y: 5 };

    expect(resolveClick(legalActions(state), state, selection, target)).toEqual({
      kind: "play",
      action: { kind: "move", pieceId: "a-trap", to: target },
    });
    const aimed = aimAbility(selection, true);
    expect(resolveClick(legalActions(state), state, aimed, target)).toEqual({
      kind: "play",
      action: { kind: "ability", pieceId: "a-trap", target },
    });
    // Armée, la capacité masque les déplacements : une case à deux pas ne joue rien.
    expect(resolveClick(legalActions(state), state, aimed, { x: 7, y: 5 })).toEqual({
      kind: "clear",
    });
  });

  it("ne s'arme pas sans cible", () => {
    const state = game();
    const selection = selectionFor(legalActions(state), pieceOf(state, "a-scout"));
    expect(aimAbility(selection, true).aiming).toBe(false);
  });
});
