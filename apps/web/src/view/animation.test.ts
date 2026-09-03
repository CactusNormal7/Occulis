import { describe, expect, it } from "vitest";
import { Board } from "@occulis/core";
import { advance, positionOf, startMove } from "./animation.js";

/** Une butte de hauteur 3 en (2,0), pour vérifier l'interpolation verticale. */
const BOARD = Board.fromAscii(["0030"]);

describe("startMove", () => {
  it("relève les hauteurs de départ et d'arrivée", () => {
    const animation = startMove("p", { x: 0, y: 0 }, { x: 2, y: 0 }, BOARD);

    expect(animation.fromHeight).toBe(0);
    expect(animation.toHeight).toBe(3);
  });

  it("dure plus longtemps pour un déplacement plus long, mais reste bornée", () => {
    const short = startMove("p", { x: 0, y: 0 }, { x: 1, y: 0 }, BOARD);
    const long = startMove("p", { x: 0, y: 0 }, { x: 3, y: 0 }, BOARD);
    const absurd = startMove("p", { x: 0, y: 0 }, { x: 400, y: 0 }, BOARD);

    expect(long.duration).toBeGreaterThan(short.duration);
    expect(absurd.duration).toBeLessThanOrEqual(500);
  });
});

describe("positionOf", () => {
  const animation = startMove("p", { x: 0, y: 0 }, { x: 2, y: 0 }, BOARD);

  it("part exactement de la case d'origine", () => {
    expect(positionOf(animation)).toEqual({ coord: { x: 0, y: 0 }, height: 0 });
  });

  it("interpole position et hauteur ensemble", () => {
    const half = positionOf({ ...animation, elapsed: animation.duration / 2 });

    expect(half.coord.x).toBeCloseTo(1, 6);
    expect(half.height).toBeCloseTo(1.5, 6);
  });

  it("reste entre les deux cases sur toute la durée", () => {
    for (let step = 0; step <= 10; step += 1) {
      const at = positionOf({ ...animation, elapsed: (animation.duration * step) / 10 });
      expect(at.coord.x).toBeGreaterThanOrEqual(0);
      expect(at.coord.x).toBeLessThanOrEqual(2);
      expect(at.height).toBeGreaterThanOrEqual(0);
      expect(at.height).toBeLessThanOrEqual(3);
    }
  });

  it("progresse de façon monotone : jamais de retour en arrière", () => {
    let previous = -1;
    for (let step = 0; step <= 20; step += 1) {
      const x = positionOf({ ...animation, elapsed: (animation.duration * step) / 20 }).coord.x;
      expect(x).toBeGreaterThanOrEqual(previous);
      previous = x;
    }
  });
});

describe("advance", () => {
  it("accumule le temps écoulé", () => {
    const animation = startMove("p", { x: 0, y: 0 }, { x: 3, y: 0 }, BOARD);
    expect(advance(animation, 10)?.elapsed).toBe(10);
  });

  it("se termine une fois la durée atteinte", () => {
    const animation = startMove("p", { x: 0, y: 0 }, { x: 1, y: 0 }, BOARD);
    expect(advance(animation, animation.duration)).toBeUndefined();
    expect(advance(animation, animation.duration + 1000)).toBeUndefined();
  });
});
