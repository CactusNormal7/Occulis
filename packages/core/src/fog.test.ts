import { describe, expect, it } from "vitest";
import { applyAction } from "./actions.js";
import { Board } from "./board.js";
import { coordKey } from "./coord.js";
import { emptyKnowledge, observe, viewFor, visibleTilesFor } from "./fog.js";
import type { Result } from "./result.js";
import { type GameState, createGame } from "./state.js";
import { definePiece, placePiece, testRuleset } from "./testing.js";

const ruleset = testRuleset(
  definePiece("scout", { steps: 1, adjacency: "orthogonal", vision: 3 }),
  definePiece("commander", { steps: 1, adjacency: "orthogonal", vision: 1, isCommander: true }),
);

function unwrap<T>(result: Result<T, unknown>): T {
  if (!result.ok) throw new Error(`action refusée: ${JSON.stringify(result.error)}`);
  return result.value;
}

/** Couloir de 7 cases coupé par un mur de hauteur 9 en (3,0). */
function corridor(): GameState {
  return createGame(Board.fromAscii(["0009000"]), ruleset, [
    placePiece("a-scout", "scout", "A", 0, 0),
    placePiece("a-cmd", "commander", "A", 1, 0),
    placePiece("b-scout", "scout", "B", 6, 0),
    placePiece("b-cmd", "commander", "B", 5, 0),
  ]);
}

/** A tient (5,0) en vue depuis (2,0) ; reculer d'un pas le fait sortir de portée. */
function ambush(): GameState {
  return createGame(Board.flat(9, 1), ruleset, [
    placePiece("a-scout", "scout", "A", 2, 0),
    placePiece("a-cmd", "commander", "A", 0, 0),
    placePiece("b-cmd", "commander", "B", 5, 0),
  ]);
}

describe("visibleTilesFor", () => {
  it("unit les champs de vision des pièces d'un joueur", () => {
    const state = corridor();
    const visible = visibleTilesFor(state.board, state, "A");
    expect(visible.has(coordKey({ x: 0, y: 0 }))).toBe(true);
    expect(visible.has(coordKey({ x: 3, y: 0 }))).toBe(true);
    // Le mur occulte tout ce qui est derrière.
    expect(visible.has(coordKey({ x: 4, y: 0 }))).toBe(false);
    expect(visible.has(coordKey({ x: 6, y: 0 }))).toBe(false);
  });

  it("borne la vision à la portée de chaque pièce", () => {
    const state = createGame(Board.flat(9, 1), ruleset, [
      placePiece("a-scout", "scout", "A", 0, 0),
      placePiece("a-cmd", "commander", "A", 8, 0),
      placePiece("b-cmd", "commander", "B", 4, 0),
    ]);
    const visible = visibleTilesFor(state.board, state, "A");
    // Le scout voit jusqu'à x=3, le commandant seulement ses voisins immédiats.
    expect(visible.has(coordKey({ x: 3, y: 0 }))).toBe(true);
    expect(visible.has(coordKey({ x: 4, y: 0 }))).toBe(false);
    expect(visible.has(coordKey({ x: 7, y: 0 }))).toBe(true);
  });
});

describe("observe — mémoire du fog of war", () => {
  it("ne mémorise pas une pièce jamais vue", () => {
    const knowledge = observe(emptyKnowledge("A"), corridor());
    expect([...knowledge.remembered.keys()]).toEqual([]);
  });

  it("mémorise une pièce adverse aperçue", () => {
    const state = createGame(Board.flat(4, 1), ruleset, [
      placePiece("a-scout", "scout", "A", 0, 0),
      placePiece("a-cmd", "commander", "A", 1, 0),
      placePiece("b-cmd", "commander", "B", 2, 0),
    ]);
    const knowledge = observe(emptyKnowledge("A"), state);
    expect(knowledge.remembered.get("b-cmd")).toMatchObject({
      id: "b-cmd",
      owner: "B",
      coord: { x: 2, y: 0 },
      lastSeenTurn: 0,
    });
  });

  it("efface le fantôme quand la case mémorisée est revue vide", () => {
    // A garde (3,0) en vue ; b-cmd s'en va sous ses yeux.
    const state = createGame(Board.flat(8, 1), ruleset, [
      placePiece("a-scout", "scout", "A", 0, 0),
      placePiece("a-cmd", "commander", "A", 1, 0),
      placePiece("b-cmd", "commander", "B", 3, 0),
    ], "B");
    const seen = observe(emptyKnowledge("A"), state);
    expect(seen.remembered.get("b-cmd")?.coord).toEqual({ x: 3, y: 0 });

    const moved = unwrap(applyAction(state, { kind: "move", pieceId: "b-cmd", to: { x: 4, y: 0 } }));
    const after = observe(seen, moved);

    expect(after.visible.has(coordKey({ x: 3, y: 0 }))).toBe(true);
    expect(after.remembered.has("b-cmd")).toBe(false);
  });

  it("conserve le fantôme tant que le souvenir n'est pas contredit", () => {
    const state = ambush();
    const seen = observe(emptyKnowledge("A"), state);
    expect(seen.remembered.get("b-cmd")?.coord).toEqual({ x: 5, y: 0 });

    // A recule : (5,0) sort de sa portée de vision, le souvenir n'est pas démenti.
    const withdrawn = unwrap(applyAction(state, { kind: "move", pieceId: "a-scout", to: { x: 1, y: 0 } }));
    const after = observe(seen, withdrawn);

    expect(after.visible.has(coordKey({ x: 5, y: 0 }))).toBe(false);
    expect(after.remembered.get("b-cmd")).toMatchObject({ coord: { x: 5, y: 0 }, lastSeenTurn: 0 });
  });
});

describe("viewFor — redaction serveur-side", () => {
  it("ne transmet aucune pièce adverse hors LOS", () => {
    const state = corridor();
    const view = viewFor(state, observe(emptyKnowledge("A"), state));

    expect(view.ownPieces.map((p) => p.id).sort()).toEqual(["a-cmd", "a-scout"]);
    expect(view.visibleEnemies).toEqual([]);
    expect(view.ghosts).toEqual([]);

    // Aucune coordonnée adverse ne doit apparaître dans la charge utile sérialisée.
    const payload = JSON.stringify(view);
    expect(payload).not.toContain("b-scout");
    expect(payload).not.toContain("b-cmd");
  });

  it("transmet l'adversaire visible comme pièce réelle, pas comme fantôme", () => {
    const state = createGame(Board.flat(4, 1), ruleset, [
      placePiece("a-scout", "scout", "A", 0, 0),
      placePiece("a-cmd", "commander", "A", 1, 0),
      placePiece("b-cmd", "commander", "B", 2, 0),
    ]);
    const view = viewFor(state, observe(emptyKnowledge("A"), state));
    expect(view.visibleEnemies.map((p) => p.id)).toEqual(["b-cmd"]);
    expect(view.ghosts).toEqual([]);
  });

  it("bascule la pièce en fantôme quand elle sort de la vue", () => {
    const state = ambush();
    const seen = observe(emptyKnowledge("A"), state);
    expect(viewFor(state, seen).visibleEnemies.map((p) => p.id)).toEqual(["b-cmd"]);

    const withdrawn = unwrap(applyAction(state, { kind: "move", pieceId: "a-scout", to: { x: 1, y: 0 } }));
    const view = viewFor(withdrawn, observe(seen, withdrawn));

    expect(view.visibleEnemies).toEqual([]);
    expect(view.ghosts.map((g) => g.id)).toEqual(["b-cmd"]);
  });
});
