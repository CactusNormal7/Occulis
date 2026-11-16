import { describe, expect, it } from "vitest";
import { Board } from "./board.js";
import { type Coord, coordKey } from "./coord.js";
import { reachableTiles } from "./movement.js";
import type { MovementProfile } from "./pieces/index.js";

const walker = (overrides: Partial<MovementProfile> = {}): MovementProfile => ({
  steps: 1,
  adjacency: "orthogonal",
  canClimb: true,
  ...overrides,
});

const at = (map: Map<string, { cost: number; kind: string }>, coord: Coord) =>
  map.get(coordKey(coord));

describe("reachableTiles — déplacement horizontal", () => {
  it("atteint les cases à portée et exclut la case de départ", () => {
    const options = reachableTiles(Board.flat(5, 5), { x: 2, y: 2 }, walker({ steps: 1 }));
    expect(options.size).toBe(4);
    expect(at(options, { x: 2, y: 2 })).toBeUndefined();
    expect(at(options, { x: 3, y: 2 })?.cost).toBe(1);
  });

  it("compte le coût en nombre de pas", () => {
    const options = reachableTiles(Board.flat(9, 9), { x: 4, y: 4 }, walker({ steps: 3 }));
    expect(at(options, { x: 7, y: 4 })?.cost).toBe(3);
    expect(at(options, { x: 8, y: 4 })).toBeUndefined();
  });

  it("contourne les cases infranchissables au lieu de les traverser", () => {
    // La barrière infranchissable en (0,1)-(1,1) impose un détour : (2,1) est à
    // 3 pas par le contour alors qu'il serait à 2 en traversant.
    const board = Board.fromAscii(["000", "~~0", "000"]);
    expect(
      at(reachableTiles(board, { x: 0, y: 0 }, walker({ steps: 2 })), { x: 2, y: 1 }),
    ).toBeUndefined();
    expect(
      at(reachableTiles(board, { x: 0, y: 0 }, walker({ steps: 3 })), { x: 2, y: 1 })?.cost,
    ).toBe(3);
  });

  it("n'autorise jamais à s'arrêter sur une case infranchissable", () => {
    const board = Board.fromAscii(["0~0"]);
    const options = reachableTiles(board, { x: 0, y: 0 }, walker({ steps: 3 }));
    expect(options.size).toBe(0);
  });

  it("est bloqué par les pièces présentes sur le chemin", () => {
    const board = Board.flat(5, 1);
    const occupied = new Set([coordKey({ x: 1, y: 0 })]);
    const options = reachableTiles(board, { x: 0, y: 0 }, walker({ steps: 3 }), occupied);
    expect(options.size).toBe(0);
  });

  it("ne sort pas de la carte", () => {
    const options = reachableTiles(Board.flat(1, 1), { x: 0, y: 0 }, walker({ steps: 5 }));
    expect(options.size).toBe(0);
  });
});

describe("reachableTiles — verticalité (design.md 5.3)", () => {
  it("descend librement, quel que soit le dénivelé", () => {
    const board = Board.fromAscii(["90"]);
    const options = reachableTiles(board, { x: 0, y: 0 }, walker({ steps: 1 }));
    expect(at(options, { x: 1, y: 0 })).toEqual({
      coord: { x: 1, y: 0 },
      cost: 1,
      kind: "walk",
      capture: false,
    });
  });

  it("monter d'un niveau consomme le tour entier", () => {
    const board = Board.fromAscii(["01"]);
    const options = reachableTiles(board, { x: 0, y: 0 }, walker({ steps: 3 }));
    expect(at(options, { x: 1, y: 0 })).toEqual({
      coord: { x: 1, y: 0 },
      cost: 3,
      kind: "climb",
      capture: false,
    });
  });

  it("refuse un dénivelé de 2 niveaux ou plus", () => {
    const board = Board.fromAscii(["02"]);
    const options = reachableTiles(board, { x: 0, y: 0 }, walker({ steps: 3 }));
    expect(options.size).toBe(0);
  });

  it("ne permet pas de marcher puis de grimper dans le même tour", () => {
    // Le design exige d'être déjà collé au relief : (2,0) n'est atteignable qu'au
    // tour suivant, une fois la pièce arrivée en (1,0).
    const board = Board.fromAscii(["001"]);
    const options = reachableTiles(board, { x: 0, y: 0 }, walker({ steps: 2 }));
    expect(at(options, { x: 1, y: 0 })?.kind).toBe("walk");
    expect(at(options, { x: 2, y: 0 })).toBeUndefined();
  });

  it("gravit un mur de hauteur 3 en trois tours", () => {
    const board = Board.fromAscii(["0123"]);
    let position = { x: 0, y: 0 };
    for (let turn = 0; turn < 3; turn++) {
      const options = reachableTiles(board, position, walker({ steps: 1 }));
      const next = at(options, { x: position.x + 1, y: 0 });
      expect(next?.kind).toBe("climb");
      position = { x: position.x + 1, y: 0 };
    }
    expect(board.heightAt(position)).toBe(3);
  });

  it("un déplacement long descend de 8 à 6 par des cases plus basses", () => {
    const options = reachableTiles(Board.fromAscii(["876"]), { x: 0, y: 0 }, walker({ steps: 2 }));
    expect(at(options, { x: 2, y: 0 })).toEqual({
      coord: { x: 2, y: 0 },
      cost: 2,
      kind: "walk",
      capture: false,
    });
  });

  it("un déplacement long s'arrête à la première montée, même d'un niveau", () => {
    // 8 → 5 → 6 : le pas de 5 à 6 monte, le chemin s'arrête en 5.
    const options = reachableTiles(Board.fromAscii(["856"]), { x: 0, y: 0 }, walker({ steps: 2 }));
    expect(at(options, { x: 1, y: 0 })?.kind).toBe("walk");
    expect(at(options, { x: 2, y: 0 })).toBeUndefined();
  });

  it("un chemin à plat n'arrête pas un déplacement long", () => {
    const options = reachableTiles(Board.fromAscii(["8886"]), { x: 0, y: 0 }, walker({ steps: 3 }));
    expect(at(options, { x: 2, y: 0 })?.cost).toBe(2);
    expect(at(options, { x: 3, y: 0 })).toEqual({
      coord: { x: 3, y: 0 },
      cost: 3,
      kind: "walk",
      capture: false,
    });
  });

  it("immobilise verticalement une pièce qui ne sait pas grimper", () => {
    const board = Board.fromAscii(["01"]);
    const options = reachableTiles(board, { x: 0, y: 0 }, walker({ canClimb: false }));
    expect(options.size).toBe(0);
  });
});

describe("reachableTiles — prise à l'arrivée", () => {
  const at = (x: number, y: number): string => coordKey({ x, y });

  it("s'arrête sur une case prenable sans la traverser", () => {
    const board = Board.flat(5, 1);
    const enemy = new Set([at(2, 0)]);
    const options = reachableTiles(board, { x: 0, y: 0 }, walker({ steps: 4 }), enemy, enemy);

    expect(options.get(at(2, 0))).toMatchObject({ capture: true, kind: "walk" });
    expect(options.get(at(1, 0))).toMatchObject({ capture: false });
    expect(options.has(at(3, 0))).toBe(false);
  });

  it("n'entre pas sur une case occupée qui n'est pas prenable", () => {
    const board = Board.flat(3, 1);
    const options = reachableTiles(
      board,
      { x: 0, y: 0 },
      walker({ steps: 2 }),
      new Set([at(1, 0)]),
    );
    expect(options.size).toBe(0);
  });

  it("suit la règle de hauteur du déplacement : aucune montée en cours de route", () => {
    const board = Board.fromAscii(["001"]);
    const enemy = new Set([at(2, 0)]);
    const options = reachableTiles(board, { x: 0, y: 0 }, walker({ steps: 3 }), enemy, enemy);
    expect(options.has(at(2, 0))).toBe(false);
  });

  it("prend en grimpant d'un niveau, collée au relief, jamais de deux", () => {
    const enemy = new Set([at(1, 0)]);
    const oneUp = reachableTiles(Board.fromAscii(["01"]), { x: 0, y: 0 }, walker(), enemy, enemy);
    expect(oneUp.get(at(1, 0))).toMatchObject({ capture: true, kind: "climb" });

    const twoUp = reachableTiles(Board.fromAscii(["02"]), { x: 0, y: 0 }, walker(), enemy, enemy);
    expect(twoUp.size).toBe(0);
  });

  it("prend librement vers le bas", () => {
    const enemy = new Set([at(1, 0)]);
    const down = reachableTiles(Board.fromAscii(["90"]), { x: 0, y: 0 }, walker(), enemy, enemy);
    expect(down.get(at(1, 0))).toMatchObject({ capture: true });
  });
});
