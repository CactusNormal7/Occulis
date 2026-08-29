import { describe, expect, it } from "vitest";
import { Board, type Coord } from "@occulis/core";
import {
  type Camera,
  ZOOM_STEP,
  createCamera,
  originOf,
  pivotOf,
  rotateBy,
  settle,
  snapRotation,
  toProjection,
  turn,
  zoomAt,
} from "./camera.js";
import { QUARTER_TURN, project, snapAngle } from "./iso.js";

const VIEWPORT = { x: 800, y: 600 };

function camera(): Camera {
  return createCamera({ x: 1, y: 1 }, VIEWPORT);
}

/** Position à l'écran d'une case, pan et zoom compris. */
function screenOf(state: Camera, coord: Coord, height = 0): { x: number; y: number } {
  const point = project(coord, height, toProjection(state));
  const origin = originOf(state);
  return { x: point.x + origin.x, y: point.y + origin.y };
}

describe("pivotOf", () => {
  it("prend le centre des extrémités du plateau", () => {
    expect(pivotOf(Board.fromAscii(["0000", "0000"]))).toEqual({ x: 1.5, y: 0.5 });
  });

  it("tolère un plateau vide", () => {
    expect(pivotOf(new Board([]))).toEqual({ x: 0, y: 0 });
  });
});

describe("zoomAt", () => {
  it("laisse immobile le point du monde sous le curseur", () => {
    const before = camera();
    const coord = { x: 3, y: 2 };
    const cursor = screenOf(before, coord);

    const after = zoomAt(before, cursor, 1.5);
    const moved = screenOf(after, coord);

    expect(after.scale).toBeCloseTo(1.5, 10);
    expect(moved.x).toBeCloseTo(cursor.x, 8);
    expect(moved.y).toBeCloseTo(cursor.y, 8);
  });

  it("tient aussi sur une case en hauteur et hors du centre", () => {
    const before = zoomAt(camera(), { x: 120, y: 400 }, 1 / ZOOM_STEP);
    const coord = { x: 0, y: 4 };
    const cursor = screenOf(before, coord, 3);

    const moved = screenOf(zoomAt(before, cursor, ZOOM_STEP), coord, 3);

    expect(moved.x).toBeCloseTo(cursor.x, 8);
    expect(moved.y).toBeCloseTo(cursor.y, 8);
  });

  it("borne l'échelle et rend la caméra inchangée une fois la borne atteinte", () => {
    let state = camera();
    for (let i = 0; i < 100; i += 1) state = zoomAt(state, { x: 400, y: 300 }, 1 / ZOOM_STEP);
    expect(state.scale).toBeGreaterThan(0);
    expect(zoomAt(state, { x: 400, y: 300 }, 1 / ZOOM_STEP)).toBe(state);

    for (let i = 0; i < 200; i += 1) state = zoomAt(state, { x: 400, y: 300 }, ZOOM_STEP);
    expect(zoomAt(state, { x: 400, y: 300 }, ZOOM_STEP)).toBe(state);
  });
});

describe("rotation", () => {
  it("ne vise rien tant qu'on tourne à la main", () => {
    const turned = rotateBy(camera(), 0.4);
    expect(turned.rotation).toBeCloseTo(0.4, 10);
    expect(turned.targetRotation).toBe(turned.rotation);
  });

  it("aimante sur le quart de tour le plus proche au relâchement", () => {
    const snapped = snapRotation(rotateBy(camera(), 1.2));
    expect(snapped.targetRotation).toBeCloseTo(QUARTER_TURN, 10);
  });

  it("vise le quart de tour voisin", () => {
    expect(turn(camera(), 1).targetRotation).toBeCloseTo(QUARTER_TURN, 10);
    expect(turn(camera(), -1).targetRotation).toBeCloseTo(-QUARTER_TURN, 10);
  });
});

describe("settle", () => {
  it("converge exactement sur l'angle visé", () => {
    let state = snapRotation(rotateBy(camera(), 1.2));
    for (let frame = 0; frame < 200 && state.rotation !== state.targetRotation; frame += 1) {
      state = settle(state, 16);
    }

    expect(state.rotation).toBe(state.targetRotation);
    expect(state.rotation).toBeCloseTo(snapAngle(1.2), 10);
  });

  it("ne fait rien une fois l'angle atteint", () => {
    const state = camera();
    expect(settle(state, 16)).toBe(state);
  });
});
