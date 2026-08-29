import { describe, expect, it } from "vitest";
import { Board } from "../board.js";
import { type Coord, coordKey } from "../coord.js";
import { definePiece } from "../testing.js";
import { PieceType } from "./piece-type.js";
import { Ruleset } from "./ruleset.js";

/**
 * Comportement de la classe de base, exercé sur des types définis pour le test.
 * Volontairement indépendant du roster : ses portées sont provisoires
 * (docs/design.md point ouvert 12) et ne doivent pas pouvoir casser une
 * vérification de règle en changeant de valeur.
 */

const FLAT = Board.flat(10, 1);

/** Deux moitiés de carte séparées par un mur de hauteur 2 en x = 4. */
const WALLED = Board.fromAscii(["000020000"]);

const ORIGIN: Coord = { x: 0, y: 0 };

describe("vision définie par la pièce", () => {
  it("borne le champ de vision à la portée du type", () => {
    const longSighted = definePiece("long", { vision: 6 });
    const shortSighted = definePiece("court", { vision: 3 });

    expect(longSighted.canSee(FLAT, ORIGIN, { x: 6, y: 0 })).toBe(true);
    expect(shortSighted.canSee(FLAT, ORIGIN, { x: 6, y: 0 })).toBe(false);
    expect(shortSighted.canSee(FLAT, ORIGIN, { x: 3, y: 0 })).toBe(true);
  });

  it("occulte tout type de pièce de la même façon : le relief ne se négocie pas", () => {
    for (const vision of [6, Number.POSITIVE_INFINITY]) {
      expect(definePiece("x", { vision }).canSee(WALLED, ORIGIN, { x: 6, y: 0 })).toBe(false);
    }
  });

  it("dérive le champ de vision de canSee, redéfinition comprise", () => {
    /** Pièce de test : voit à travers le relief, mais garde la portée de sa classe. */
    class Clairvoyant extends PieceType {
      readonly kind = "clairvoyant";
      readonly movement = { steps: 1, adjacency: "octile", canClimb: true } as const;
      readonly vision = { range: 20 } as const;

      override canSee(_board: Board, from: Coord, to: Coord): boolean {
        return this.visionRangeCovers(from, to);
      }
    }

    const blocked = coordKey({ x: 6, y: 0 });
    expect(definePiece("normal", { vision: 20 }).fieldOfView(WALLED, ORIGIN).has(blocked)).toBe(
      false,
    );
    expect(new Clairvoyant().fieldOfView(WALLED, ORIGIN).has(blocked)).toBe(true);
  });

  it("ne voit rien depuis une case hors-carte", () => {
    expect(definePiece("x").fieldOfView(FLAT, { x: -1, y: 0 }).size).toBe(0);
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
    const type = definePiece("x");

    expect(type.canStrike(cliff, { x: 1, y: 0 }, { x: 0, y: 0 })).toBe(true);
    expect(type.canStrike(cliff, { x: 0, y: 0 }, { x: 1, y: 0 })).toBe(false);
  });
});

describe("déplacement défini par la pièce", () => {
  it("consomme le budget de pas du type", () => {
    const board = Board.flat(5, 1);
    const far = coordKey({ x: 3, y: 0 });

    expect(definePiece("rapide", { steps: 3 }).destinationsFrom(board, ORIGIN).has(far)).toBe(true);
    expect(definePiece("lent", { steps: 1 }).destinationsFrom(board, ORIGIN).has(far)).toBe(false);
  });

  it("contourne les cases occupées, qui bloquent le passage", () => {
    const board = Board.flat(5, 1);
    const blocked = definePiece("x", { steps: 3 }).destinationsFrom(
      board,
      ORIGIN,
      new Set([coordKey({ x: 1, y: 0 })]),
    );

    expect(blocked.has(coordKey({ x: 2, y: 0 }))).toBe(false);
  });
});

describe("extension par héritage", () => {
  it("accepte un type défini par une classe comme un type défini par des données", () => {
    /** Sentinelle : une pièce maîtresse immobile, pour vérifier le point d'extension. */
    class Sentinel extends PieceType {
      readonly kind = "sentinel";
      readonly movement = { steps: 0, adjacency: "orthogonal", canClimb: false } as const;
      readonly vision = { range: 2 } as const;

      override get isCommander(): boolean {
        return true;
      }
    }

    const sentinel = new Sentinel();
    const ruleset = new Ruleset([sentinel, definePiece("scout")]);

    expect(sentinel).toBeInstanceOf(PieceType);
    expect(sentinel.isCommander).toBe(true);
    expect(sentinel.destinationsFrom(FLAT, ORIGIN).size).toBe(0);
    expect(ruleset.get("sentinel")).toBe(sentinel);
  });
});
