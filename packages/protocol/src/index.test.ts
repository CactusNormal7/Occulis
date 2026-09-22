import { describe, expect, it } from "vitest";
import { Board, createGame, provisionalRuleset, startMemory, viewFor } from "@occulis/core";
import { decodeView, encodeView } from "./index.js";

/** Un mur de hauteur 3 sur toute la colonne 7 : aucun camp ne voit l'autre. */
const WALLED = Array.from({ length: 14 }, () => "0000000" + "3" + "000000");

function view() {
  const state = createGame(Board.fromAscii(WALLED), provisionalRuleset(), [
    { id: "a-scout", kind: "scout", owner: "A", coord: { x: 0, y: 0 } },
    { id: "a-cmd", kind: "commander", owner: "A", coord: { x: 0, y: 13 } },
    { id: "b-cmd", kind: "commander", owner: "B", coord: { x: 13, y: 13 } },
  ]);
  const memory = startMemory(state);
  return viewFor(memory.state, memory.knowledge.A);
}

describe("encodeView / decodeView", () => {
  it("survit à un aller-retour par JSON", () => {
    // `PlayerView.visible` est un `Set`, que `JSON.stringify` sérialise en `{}` :
    // sans encodage explicite, le client recevrait un fog vide et verrait tout.
    const original = view();
    const roundTrip = decodeView(JSON.parse(JSON.stringify(encodeView(original))));

    expect(roundTrip.visible).toEqual(original.visible);
    expect(roundTrip.visible.size).toBeGreaterThan(0);
    expect(roundTrip.ownPieces).toEqual(original.ownPieces);
    // La liste que l'interface utilise pour la surbrillance : si elle ne survit pas
    // au JSON, le client ne propose plus aucun coup.
    expect(roundTrip.legalActions).toEqual(original.legalActions);
    expect(roundTrip.legalActions.length).toBeGreaterThan(0);
    expect(roundTrip.player).toBe("A");
  });

  it("ne transporte aucune pièce hors de la ligne de vue", () => {
    const wire = encodeView(view());
    const serialized = JSON.stringify(wire);

    expect(wire.visibleEnemies).toEqual([]);
    expect(serialized).not.toContain("b-cmd");
  });
});
