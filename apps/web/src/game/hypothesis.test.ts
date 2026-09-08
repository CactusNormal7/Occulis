import { describe, expect, it } from "vitest";
import {
  type Action,
  Board,
  applyAction,
  createGame,
  legalActions,
  provisionalRuleset,
  startMemory,
  viewFor,
} from "@occulis/core";
import { anticipate, hypothesisFrom } from "./hypothesis.js";

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

describe("anticipate", () => {
  /**
   * Le bug qui gelait les parties : sous fog, la pièce maîtresse adverse n'est pas
   * dans l'hypothèse, donc `applyAction` y voyait un camp décapité et proclamait la
   * victoire du joueur au premier coup venu. `legalActions` d'une partie terminée
   * étant vide, le plateau devenait ensuite intouchable.
   */
  it("ne déclare aucune fin de partie sur un plateau amputé par le fog", () => {
    const { state, knowledge } = memory();
    const view = viewFor(state, knowledge.A);
    expect(view.visibleEnemies).toEqual([]);

    const hypothesis = hypothesisFrom(view, state.board, state.ruleset);
    const move = legalActions(hypothesis)[0];
    expect(move).toBeDefined();

    // Ce que faisait l'ancien chemin : le camp adverse paraît décapité, donc
    // `applyAction` proclame une victoire imaginaire — et une partie terminée n'a
    // plus aucun coup légal, d'où le plateau gelé.
    const adjudicated = applyAction(hypothesis, move as Action);
    expect(adjudicated.ok && adjudicated.value.outcome).toEqual({
      kind: "victory",
      winner: "A",
      reason: "commander-captured",
    });

    const anticipated = anticipate(hypothesis, move as Action);
    expect(anticipated.ok).toBe(true);
    if (!anticipated.ok) return;
    expect(anticipated.value.outcome).toBeNull();
  });

  it("laisse le joueur rejouer dès que le trait lui revient", () => {
    const { state, knowledge } = memory();
    const hypothesis = hypothesisFrom(viewFor(state, knowledge.A), state.board, state.ruleset);
    const anticipated = anticipate(hypothesis, legalActions(hypothesis)[0] as Action);
    expect(anticipated.ok).toBe(true);
    if (!anticipated.ok) return;

    // Le trait revenu, le plateau répond encore — c'était le symptôme : plus rien
    // n'était sélectionnable ni déplaçable, quel que soit le tour.
    const back = { ...anticipated.value, activePlayer: "A" as const };
    expect(legalActions(back).length).toBeGreaterThan(0);
  });

  it("avance bien la position et passe le trait", () => {
    const { state, knowledge } = memory();
    const hypothesis = hypothesisFrom(viewFor(state, knowledge.A), state.board, state.ruleset);
    const move: Action = { kind: "move", pieceId: "a-scout", to: { x: 1, y: 0 } };

    const anticipated = anticipate(hypothesis, move);
    expect(anticipated.ok).toBe(true);
    if (!anticipated.ok) return;

    expect(anticipated.value.pieces.get("a-scout")?.coord).toEqual({ x: 1, y: 0 });
    expect(anticipated.value.activePlayer).toBe("B");
    expect(anticipated.value.turn).toBe(hypothesis.turn + 1);
  });

  it("laisse passer le refus des règles sans le masquer", () => {
    const { state, knowledge } = memory();
    const hypothesis = hypothesisFrom(viewFor(state, knowledge.A), state.board, state.ruleset);

    const absurd: Action = { kind: "move", pieceId: "a-scout", to: { x: 13, y: 13 } };
    expect(anticipate(hypothesis, absurd)).toEqual({
      ok: false,
      error: { code: "unreachable", to: { x: 13, y: 13 } },
    });
  });
});
