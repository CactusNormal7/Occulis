import { describe, expect, it } from "vitest";
import { Board } from "../board.js";
import { type Coord, type CoordKey, coordKey } from "../coord.js";
import type { MoveOption } from "../movement.js";
import { definePiece } from "../testing.js";
import { ConfigurablePieceType } from "./configurable-piece-type.js";
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

  it("transmet l'occupation : une pièce coupe la vue comme le relief", () => {
    const type = definePiece("x", { vision: 6 });
    const occupied = new Set([coordKey({ x: 3, y: 0 })]);

    expect(type.canSee(FLAT, ORIGIN, { x: 6, y: 0 })).toBe(true);
    expect(type.canSee(FLAT, ORIGIN, { x: 6, y: 0 }, occupied)).toBe(false);
    expect(type.fieldOfView(FLAT, ORIGIN, occupied).has(coordKey({ x: 6, y: 0 }))).toBe(false);
  });

  it("dérive le champ de vision de canSee, redéfinition comprise", () => {
    /** Pièce de test : voit à travers le relief, mais garde la portée de sa classe. */
    class Clairvoyant extends PieceType {
      readonly kind = "clairvoyant";
      readonly movement = { steps: 1, adjacency: "octile", canClimb: true } as const;
      readonly vision = { range: 20 } as const;

      override canSee(
        _board: Board,
        from: Coord,
        to: Coord,
        _occupied?: ReadonlySet<CoordKey>,
      ): boolean {
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

describe("prise définie par la pièce", () => {
  const target = { x: 2, y: 0 };
  const targets = new Set([coordKey(target)]);

  it("prend par défaut là où son déplacement peut s'achever", () => {
    const board = Board.flat(4, 1);
    expect(
      definePiece("near", { steps: 1 }).threatens(board, { x: 0, y: 0 }, target, targets),
    ).toBe(false);
    expect(definePiece("far", { steps: 2 }).threatens(board, { x: 0, y: 0 }, target, targets)).toBe(
      true,
    );
  });

  it("ne prend pas à travers une autre pièce", () => {
    const board = Board.flat(4, 1);
    const occupied = new Set([coordKey({ x: 1, y: 0 }), coordKey(target)]);
    expect(
      definePiece("far", { steps: 3 }).threatens(board, { x: 0, y: 0 }, target, occupied),
    ).toBe(false);
  });

  it("laisse une sous-classe prendre autrement qu'elle ne se déplace", () => {
    /** Ne prend qu'à deux cases en ligne droite, par-dessus ce qui s'y trouve. */
    class Leaper extends ConfigurablePieceType {
      override capturesFrom(
        _board: Board,
        from: Coord,
        _occupied: ReadonlySet<CoordKey>,
        reachable: ReadonlySet<CoordKey>,
      ): Map<CoordKey, MoveOption> {
        const captures = new Map<CoordKey, MoveOption>();
        for (const [dx, dy] of [
          [2, 0],
          [-2, 0],
          [0, 2],
          [0, -2],
        ] as const) {
          const coord = { x: from.x + dx, y: from.y + dy };
          const key = coordKey(coord);
          if (reachable.has(key))
            captures.set(key, { coord, cost: 1, kind: "walk", capture: true });
        }
        return captures;
      }
    }
    const leaper = new Leaper({
      kind: "leaper",
      movement: { steps: 1, adjacency: "orthogonal", canClimb: false },
      vision: { range: 5 },
    });
    const occupied = new Set([coordKey({ x: 1, y: 0 }), coordKey(target)]);

    expect(leaper.threatens(Board.flat(4, 1), { x: 0, y: 0 }, target, occupied)).toBe(true);
    expect(leaper.threatens(Board.flat(4, 1), { x: 1, y: 0 }, target, occupied)).toBe(false);
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
