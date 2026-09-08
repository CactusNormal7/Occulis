import { describe, expect, it } from "vitest";
import type { PlayerView } from "@occulis/core";
import { movementBetween } from "./movement-diff.js";

function view(pieces: {
  own?: { id: string; x: number; y: number }[];
  enemies?: { id: string; x: number; y: number }[];
}): PlayerView {
  const make = (list: { id: string; x: number; y: number }[], owner: "A" | "B") =>
    list.map((p) => ({ id: p.id, kind: "scout", owner, coord: { x: p.x, y: p.y } }));
  return {
    player: "A",
    activePlayer: "A",
    turn: 0,
    outcome: null,
    check: false,
    legalActions: [],
    visible: new Set(),
    ownPieces: make(pieces.own ?? [], "A"),
    visibleEnemies: make(pieces.enemies ?? [], "B"),
    ghosts: [],
  };
}

describe("movementBetween", () => {
  it("relève le déplacement d'une de ses propres pièces", () => {
    const before = view({ own: [{ id: "a-scout", x: 1, y: 6 }] });
    const after = view({ own: [{ id: "a-scout", x: 2, y: 6 }] });

    expect(movementBetween(before, after)).toEqual({
      pieceId: "a-scout",
      from: { x: 1, y: 6 },
      to: { x: 2, y: 6 },
    });
  });

  it("relève aussi celui de l'adversaire, quand il est visible", () => {
    // C'est ce qui permet d'animer enfin les coups d'en face : ils apparaissaient
    // d'un coup tant que l'animation venait de l'anticipation locale.
    const before = view({ enemies: [{ id: "b-scout", x: 8, y: 1 }] });
    const after = view({ enemies: [{ id: "b-scout", x: 8, y: 2 }] });

    expect(movementBetween(before, after)?.pieceId).toBe("b-scout");
  });

  it("ne bouge rien quand rien n'a bougé", () => {
    const same = view({ own: [{ id: "a-scout", x: 1, y: 6 }] });
    expect(movementBetween(same, same)).toBeUndefined();
  });

  it("ignore une pièce qui entre dans la ligne de vue", () => {
    // Elle n'a pas « bougé » : elle est devenue visible. L'animer dessinerait un
    // trajet qui n'a pas eu lieu, depuis une case que le joueur ne connaissait pas.
    const before = view({ own: [{ id: "a-scout", x: 1, y: 6 }] });
    const after = view({
      own: [{ id: "a-scout", x: 1, y: 6 }],
      enemies: [{ id: "b-scout", x: 8, y: 1 }],
    });

    expect(movementBetween(before, after)).toBeUndefined();
  });

  it("ignore une pièce qui sort de la ligne de vue", () => {
    const before = view({ enemies: [{ id: "b-scout", x: 8, y: 1 }] });
    const after = view({});

    expect(movementBetween(before, after)).toBeUndefined();
  });
});
