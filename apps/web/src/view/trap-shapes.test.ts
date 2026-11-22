import { describe, expect, it } from "vitest";
import type { Quad } from "@occulis/board/iso";
import { scaleQuad, trapJawsOf, trapSealOf } from "./trap-shapes.js";

const quad: Quad = [
  { x: 0, y: -10 },
  { x: 20, y: 0 },
  { x: 0, y: 10 },
  { x: -20, y: 0 },
];

describe("géométrie du piège", () => {
  it("met la case à l'échelle autour de son centre", () => {
    expect(scaleQuad(quad, 0.5)).toEqual([
      { x: 0, y: -5 },
      { x: 10, y: 0 },
      { x: 0, y: 5 },
      { x: -10, y: 0 },
    ]);
  });

  it("barre le sceau de ses deux diagonales", () => {
    const { cross } = trapSealOf(quad, 1);
    expect(cross).toEqual([
      [quad[0], quad[2]],
      [quad[1], quad[3]],
    ]);
  });

  it("avance les mâchoires du bord vers le milieu en se fermant", () => {
    const front = (jaws: number) => {
      const [west] = trapJawsOf(quad, jaws);
      // Le premier point du front, au nord de la mâchoire ouest.
      return west[1];
    };
    const open = front(0);
    const shut = front(1);
    expect(open).toBeDefined();
    expect(shut).toBeDefined();
    // Fermée, la mâchoire ouest a quitté le coin nord-ouest vers le nord-est.
    expect((shut?.x ?? 0) - (open?.x ?? 0)).toBeGreaterThan(5);
  });
});
