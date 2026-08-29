import { describe, expect, it } from "vitest";
import { Board } from "../board.js";
import { type Coord, coordKey } from "../coord.js";
import { definePiece } from "../testing.js";
import { PieceType } from "./piece-type.js";
import { Commander, Scout, provisionalRuleset } from "./roster.js";
import { Ruleset } from "./ruleset.js";

const FLAT = Board.flat(10, 1);

/** Deux moitiés de carte séparées par un mur de hauteur 2 en x = 4. */
const WALLED = Board.fromAscii(["000020000"]);

describe("roster provisoire", () => {
  it("distingue les pièces par capacité, jamais par robustesse", () => {
    const scout = new Scout();
    const commander = new Commander();

    expect(scout.movement.steps).toBeGreaterThan(commander.movement.steps);
    expect(scout.vision.range).toBeGreaterThan(commander.vision.range);
    expect(scout.isCommander).toBe(false);
    expect(commander.isCommander).toBe(true);
  });

  it("indexe chaque type par son kind", () => {
    const ruleset = provisionalRuleset();

    expect(ruleset.kinds().sort()).toEqual(["commander", "scout"]);
    expect(ruleset.get("scout")).toBeInstanceOf(Scout);
    expect(
      ruleset.typeOf({ id: "x", kind: "commander", owner: "A", coord: { x: 0, y: 0 } }),
    ).toBeInstanceOf(Commander);
    expect(() => ruleset.get("inconnu")).toThrow();
  });
});

describe("vision définie par la pièce", () => {
  const origin: Coord = { x: 0, y: 0 };

  it("borne le champ de vision à la portée du type", () => {
    expect(new Scout().canSee(FLAT, origin, { x: 6, y: 0 })).toBe(true);
    expect(new Commander().canSee(FLAT, origin, { x: 6, y: 0 })).toBe(false);
    expect(new Commander().canSee(FLAT, origin, { x: 3, y: 0 })).toBe(true);
  });

  it("occulte tout type de pièce de la même façon : le relief ne se négocie pas", () => {
    for (const type of [new Scout(), new Commander()]) {
      expect(type.canSee(WALLED, origin, { x: 6, y: 0 })).toBe(false);
    }
  });

  it("dérive le champ de vision de canSee, redéfinition comprise", () => {
    /** Pièce de test : voit à travers le relief, mais garde la portée de sa classe. */
    class Clairvoyant extends Scout {
      override canSee(_board: Board, from: Coord, to: Coord): boolean {
        return this.visionRangeCovers(from, to);
      }
    }

    const blocked = coordKey({ x: 6, y: 0 });
    expect(new Scout().fieldOfView(WALLED, origin).has(blocked)).toBe(false);
    expect(new Clairvoyant().fieldOfView(WALLED, origin).has(blocked)).toBe(true);
  });

  it("ne voit rien depuis une case hors-carte", () => {
    expect(new Scout().fieldOfView(FLAT, { x: -1, y: 0 }).size).toBe(0);
  });
});

describe("portée de mêlée définie par la pièce", () => {
  it("suit l'adjacence déclarée par le type", () => {
    const orthogonal = definePiece("orthogonal", { adjacency: "orthogonal" });
    const octile = definePiece("octile", { adjacency: "octile" });
    const board = Board.flat(3, 3);

    expect(orthogonal.canStrike(board, { x: 1, y: 1 }, { x: 1, y: 0 })).toBe(true);
    expect(orthogonal.canStrike(board, { x: 1, y: 1 }, { x: 0, y: 0 })).toBe(false);
    expect(octile.canStrike(board, { x: 1, y: 1 }, { x: 0, y: 0 })).toBe(true);
  });

  it("frappe librement vers le bas, d'un seul niveau vers le haut", () => {
    const cliff = Board.fromAscii(["020"]);
    const type = new Scout();

    expect(type.canStrike(cliff, { x: 1, y: 0 }, { x: 0, y: 0 })).toBe(true);
    expect(type.canStrike(cliff, { x: 0, y: 0 }, { x: 1, y: 0 })).toBe(false);
  });
});

describe("déplacement défini par la pièce", () => {
  it("consomme le budget de pas du type et contourne les cases occupées", () => {
    const board = Board.flat(5, 1);
    const scout = new Scout();

    expect(scout.destinationsFrom(board, { x: 0, y: 0 }).has(coordKey({ x: 3, y: 0 }))).toBe(true);
    expect(
      new Commander().destinationsFrom(board, { x: 0, y: 0 }).has(coordKey({ x: 3, y: 0 })),
    ).toBe(false);

    const blocked = scout.destinationsFrom(
      board,
      { x: 0, y: 0 },
      new Set([coordKey({ x: 1, y: 0 })]),
    );
    expect(blocked.has(coordKey({ x: 2, y: 0 }))).toBe(false);
  });
});

describe("extension par héritage", () => {
  it("accepte un type défini par une classe comme un type défini par des données", () => {
    /** Sentinelle : une pièce maîtresse immobile, pour vérifier le point d'extension. */
    class Sentinel extends Commander {
      override readonly kind = "sentinel";
      override readonly movement = { steps: 0, adjacency: "orthogonal", canClimb: false } as const;
    }

    const sentinel = new Sentinel();
    const ruleset = new Ruleset([sentinel, definePiece("scout")]);

    expect(sentinel).toBeInstanceOf(PieceType);
    expect(sentinel.isCommander).toBe(true);
    expect(sentinel.destinationsFrom(FLAT, { x: 0, y: 0 }).size).toBe(0);
    expect(ruleset.get("sentinel")).toBe(sentinel);
  });
});
