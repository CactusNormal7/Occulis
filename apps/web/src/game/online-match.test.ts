import { describe, expect, it } from "vitest";
import {
  type Action,
  Board,
  createGame,
  provisionalRuleset,
  startMemory,
  viewFor,
} from "@occulis/core";
import { OnlineMatch } from "./online-match.js";

/** Un mur de hauteur 3 sur la colonne 7 : aucun camp ne voit l'autre. */
const WALLED = Array.from({ length: 14 }, () => "0000000" + "3" + "000000");

function table() {
  const board = Board.fromAscii(WALLED);
  const { state, knowledge } = startMemory(
    createGame(board, provisionalRuleset(), [
      { id: "a-scout", kind: "scout", owner: "A", coord: { x: 0, y: 0 } },
      { id: "a-cmd", kind: "commander", owner: "A", coord: { x: 0, y: 13 } },
      { id: "b-cmd", kind: "commander", owner: "B", coord: { x: 13, y: 13 } },
    ]),
  );
  const sent: Action[] = [];
  const match = new OnlineMatch(
    board,
    state.ruleset,
    "A",
    (action) => sent.push(action),
    viewFor(state, knowledge.A),
  );
  return { match, sent, state, knowledge, board };
}

describe("OnlineMatch", () => {
  const step: Action = { kind: "move", pieceId: "a-scout", to: { x: 1, y: 0 } };

  it("envoie le coup sans rien déplacer ni passer le trait", () => {
    // La régression qui bloquait les parties : le client appliquait le coup, le
    // serveur le refusait sans rediffuser de vue, et le trait restait passé à
    // l'adversaire — plus rien n'était sélectionnable jusqu'à la reconnexion.
    const { match, sent } = table();
    const before = match.state;

    expect(match.play(step).ok).toBe(true);
    expect(sent).toEqual([step]);
    expect(match.state).toBe(before);
    expect(match.activePlayer).toBe("A");
    expect(match.pieceAt({ x: 0, y: 0 })?.id).toBe("a-scout");
    expect(match.pieceAt({ x: 1, y: 0 })).toBeUndefined();
  });

  it("n'envoie rien quand le coup est refusé localement", () => {
    const { match, sent } = table();
    const before = match.state;

    const absurd: Action = { kind: "move", pieceId: "a-scout", to: { x: 13, y: 13 } };
    expect(match.play(absurd)).toEqual({
      ok: false,
      error: { code: "unreachable", to: { x: 13, y: 13 } },
    });
    expect(sent).toEqual([]);
    expect(match.state).toBe(before);
  });

  it("reste jouable après un refus du serveur", () => {
    // Un refus ne consomme rien : le tour est toujours au joueur, qui doit pouvoir
    // enchaîner sur un autre coup sans attendre quoi que ce soit.
    const { match, sent } = table();
    match.play(step);

    const other: Action = { kind: "move", pieceId: "a-scout", to: { x: 0, y: 1 } };
    expect(match.play(other).ok).toBe(true);
    expect(sent).toEqual([step, other]);
    expect(match.activePlayer).toBe("A");
  });

  it("ne bouge qu'à réception de la vue, et rend le déplacement à animer", () => {
    const { match, state, knowledge } = table();
    const { state: after, knowledge: seen } = (() => {
      const memory = startMemory(state);
      const played = memory.state;
      return startMemory({
        ...played,
        pieces: new Map([...played.pieces].map(([id, piece]) =>
          id === "a-scout" ? [id, { ...piece, coord: { x: 1, y: 0 } }] : [id, piece],
        )),
      });
    })();
    expect(knowledge).toBeDefined();

    const movement = match.receive(viewFor(after, seen.A));
    expect(movement).toEqual({ pieceId: "a-scout", from: { x: 0, y: 0 }, to: { x: 1, y: 0 } });
    expect(match.pieceAt({ x: 1, y: 0 })?.id).toBe("a-scout");
  });

  it("expose les coups légaux du serveur, pas les siens", () => {
    const { match } = table();
    expect(match.legalActions.length).toBeGreaterThan(0);
    expect(match.legalActions).toBe(match.viewFor("A").legalActions);
  });
});
