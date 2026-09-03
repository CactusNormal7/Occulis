import { describe, expect, it } from "vitest";
import { Board, type GameState, coordKey, createGame, provisionalRuleset } from "@occulis/core";
import { Match } from "./match.js";
import { demoGame } from "./scenario.js";

describe("Match", () => {
  it("part sur le joueur A et ne montre à chacun que ses propres pièces", () => {
    const match = new Match(demoGame());

    expect(match.activePlayer).toBe("A");
    expect(
      match
        .viewFor("A")
        .ownPieces.map((piece) => piece.id)
        .sort(),
    ).toEqual(["a-cmd", "a-scout"]);
    // L'arête rocheuse coupe la carte : aucun camp n'en voit un autre au départ.
    expect(match.viewFor("A").visibleEnemies).toEqual([]);
    expect(match.viewFor("B").visibleEnemies).toEqual([]);
  });

  it("rend une vue stable tant qu'aucun coup n'est joué", () => {
    const match = new Match(demoGame());
    expect(match.viewFor("A")).toBe(match.viewFor("A"));
  });

  it("passe la main et renouvelle les vues après un coup accepté", () => {
    const match = new Match(demoGame());
    const before = match.viewFor("A");

    const played = match.play({ kind: "move", pieceId: "a-scout", to: { x: 1, y: 5 } });

    expect(played.ok).toBe(true);
    expect(match.activePlayer).toBe("B");
    expect(match.state.turn).toBe(1);
    expect(match.viewFor("A")).not.toBe(before);
    expect(match.pieceAt({ x: 1, y: 5 })?.id).toBe("a-scout");
  });

  it("laisse l'état intact quand le coup est refusé", () => {
    const match = new Match(demoGame());
    const before = match.state;

    const played = match.play({ kind: "move", pieceId: "b-scout", to: { x: 8, y: 2 } });

    expect(played.ok).toBe(false);
    expect(!played.ok && played.error.code).toBe("not-your-piece");
    expect(match.state).toBe(before);
    expect(match.activePlayer).toBe("A");
  });

  it("conserve la mémoire d'une pièce vue puis perdue de vue", () => {
    const match = new Match(ridgeGame());

    // Le scout de A grimpe sur l'arête, d'où il voit par-dessus, puis redescend.
    expect(match.play({ kind: "move", pieceId: "a-scout", to: { x: 1, y: 0 } }).ok).toBe(true);
    expect(match.play({ kind: "move", pieceId: "b-cmd", to: { x: 7, y: 1 } }).ok).toBe(true);
    expect(match.play({ kind: "move", pieceId: "a-scout", to: { x: 2, y: 0 } }).ok).toBe(true);

    expect(match.viewFor("A").visibleEnemies.map((piece) => piece.id)).toContain("b-scout");

    expect(match.play({ kind: "move", pieceId: "b-cmd", to: { x: 8, y: 1 } }).ok).toBe(true);
    expect(match.play({ kind: "move", pieceId: "a-scout", to: { x: 1, y: 0 } }).ok).toBe(true);

    const view = match.viewFor("A");
    expect(view.visible.has(coordKey({ x: 7, y: 0 }))).toBe(false);
    expect(view.visibleEnemies.map((piece) => piece.id)).not.toContain("b-scout");
    expect(view.ghosts.map((ghost) => ghost.id)).toContain("b-scout");
  });
});

/** Une arête de hauteur 1 coupe la vue au sol ; la franchir du regard demande d'y monter. */
function ridgeGame(): GameState {
  const board = Board.fromAscii(["001100000", "001100000"]);
  return createGame(board, provisionalRuleset(), [
    { id: "a-scout", kind: "scout", owner: "A", coord: { x: 0, y: 0 } },
    { id: "a-cmd", kind: "commander", owner: "A", coord: { x: 0, y: 1 } },
    { id: "b-scout", kind: "scout", owner: "B", coord: { x: 7, y: 0 } },
    { id: "b-cmd", kind: "commander", owner: "B", coord: { x: 8, y: 1 } },
  ]);
}
