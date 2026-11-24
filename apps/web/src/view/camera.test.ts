import { describe, expect, it } from "vitest";
import { Board, type Coord } from "@occulis/core";
import {
  commandCamera,
  type Camera,
  PLAN_VIEW_MS,
  ZOOM_STEP,
  createCamera,
  flatnessOf,
  footprintOf,
  isLocked,
  originOf,
  panBy,
  pivotOf,
  rotateBy,
  settle,
  snapRotation,
  withViewport,
  toProjection,
  turn,
  zoomAt,
} from "./camera.js";
import { QUARTER_TURN, project, snapAngle } from "@occulis/board/iso";

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

/** Où le centre du plateau tombe à l'écran. */
function pivotOnScreen(camera: Camera): { x: number; y: number } {
  const origin = originOf(camera);
  const pivot = project(camera.pivot, 0, toProjection(camera));
  return { x: origin.x + pivot.x, y: origin.y + pivot.y };
}

describe("commandCamera", () => {
  const camera = createCamera({ x: 3, y: 3 }, { x: 800, y: 600 });

  it("pose le centre du plateau au milieu du canevas, sans panneau", () => {
    expect(pivotOnScreen(camera)).toEqual({ x: 400, y: 300 });
  });

  it("tourne d'un quart dans chaque sens, comme les flèches", () => {
    expect(commandCamera(camera, "turn-right").targetRotation).toBeCloseTo(QUARTER_TURN);
    expect(commandCamera(camera, "turn-left").targetRotation).toBeCloseTo(-QUARTER_TURN);
  });

  it("zoome sur le milieu de l'écran, qui ne bouge pas", () => {
    const zoomed = commandCamera(camera, "zoom-in");
    expect(zoomed.scale).toBeGreaterThan(camera.scale);
    expect(pivotOnScreen(zoomed).x).toBeCloseTo(400);
    expect(pivotOnScreen(zoomed).y).toBeCloseTo(300);
    expect(commandCamera(camera, "zoom-out").scale).toBeLessThan(camera.scale);
  });

  it("cadre le plateau au milieu de la zone que les panneaux laissent libre", () => {
    const framed = createCamera(
      { x: 3, y: 3 },
      { x: 800, y: 600 },
      { scale: 1.25, insets: { top: 88, right: 312, bottom: 56, left: 64 } },
    );
    expect(framed.scale).toBe(1.25);
    // Libre : de 64 à 488 en largeur, de 88 à 544 en hauteur ; milieu (276, 316).
    expect(pivotOnScreen(framed)).toEqual({ x: 276, y: 316 });
    const zoomed = commandCamera(framed, "zoom-in");
    expect(pivotOnScreen(zoomed).x).toBeCloseTo(276);
    expect(pivotOnScreen(zoomed).y).toBeCloseTo(316);
    const lost = { ...zoomed, pan: { x: 300, y: 300 } };
    expect(commandCamera(lost, "recenter")).toMatchObject({ scale: 1.25, pan: framed.pan });
  });

  it("recentre sans toucher à l'angle", () => {
    const moved = { ...commandCamera(camera, "zoom-in"), pan: { x: 40, y: -12 }, rotation: 1 };
    const back = commandCamera(moved, "recenter");
    expect(back).toMatchObject({ scale: 1, pan: camera.pan, rotation: 1 });
  });
});

describe("la vue de dessus", () => {
  const INSETS = { top: 88, right: 312, bottom: 56, left: 64 };
  const free = createCamera(
    { x: 4, y: 4 },
    { x: 800, y: 600 },
    { scale: 1.25, insets: INSETS },
    { width: 9, depth: 9, relief: 0 },
  );
  /** La bascule menée à son terme. */
  const planned = settle(commandCamera(free, "plan-view"), PLAN_VIEW_MS);

  it("bascule en une animation, à mi-chemin au milieu de sa durée", () => {
    const halfway = settle(commandCamera(free, "plan-view"), PLAN_VIEW_MS / 2);
    expect(flatnessOf(halfway)).toBeCloseTo(0.5);
    expect(flatnessOf(planned)).toBe(1);
  });

  it("aplatit le relief et redresse les cases en carrés", () => {
    const projection = toProjection(planned);
    expect(projection.heightUnit).toBe(0);
    expect(projection.tileHeight).toBe(projection.tileWidth);
    // Un pas le long d'un axe logique devient horizontal ou vertical à l'écran.
    const a = project({ x: 0, y: 0 }, 0, projection);
    const b = project({ x: 0, y: 1 }, 0, projection);
    expect(b.x - a.x).toBeCloseTo(0);
    expect(b.y).toBeGreaterThan(a.y);
  });

  it("centre le plateau entier dans la zone libre", () => {
    expect(pivotOnScreen(planned).x).toBeCloseTo(276);
    expect(pivotOnScreen(planned).y).toBeCloseTo(316);
    const corners = [
      { x: -0.5, y: -0.5 },
      { x: 8.5, y: 8.5 },
    ].map((corner) => screenOf(planned, corner));
    for (const corner of corners) {
      expect(corner.x).toBeGreaterThanOrEqual(INSETS.left);
      expect(corner.x).toBeLessThanOrEqual(800 - INSETS.right);
      expect(corner.y).toBeGreaterThanOrEqual(INSETS.top);
      expect(corner.y).toBeLessThanOrEqual(600 - INSETS.bottom);
    }
  });

  it("fige la caméra : ni pan, ni zoom, ni rotation", () => {
    expect(isLocked(planned)).toBe(true);
    expect(panBy(planned, 30, 30)).toBe(planned);
    expect(commandCamera(planned, "zoom-in")).toBe(planned);
    expect(commandCamera(planned, "turn-left")).toBe(planned);
    expect(rotateBy(planned, 0.4)).toBe(planned);
  });

  it("ramène à la vue quittée, angle, zoom et pan compris", () => {
    const moved = turn(zoomAt(panBy(free, 40, -20), { x: 200, y: 200 }, 1.3), 1);
    const settled = settle(moved, 1000);
    const back = settle(settle(commandCamera(settled, "plan-view"), PLAN_VIEW_MS), PLAN_VIEW_MS);
    const restored = settle(commandCamera(back, "plan-view"), PLAN_VIEW_MS);
    expect(isLocked(restored)).toBe(false);
    expect(restored).toMatchObject({
      scale: settled.scale,
      pan: settled.pan,
      rotation: settled.rotation,
    });
  });
});

describe("les bornes de la vue libre", () => {
  const INSETS = { top: 88, right: 312, bottom: 56, left: 64 };
  const VIEW = { x: 1440, y: 900 };
  const NINE = { width: 9, depth: 9, relief: 4 };
  const framed = createCamera({ x: 4, y: 4 }, VIEW, { scale: 1.25, insets: INSETS }, NINE);
  /** Dézoomé au plus loin : bien plus de crans qu'il n'en faut. */
  let widest = framed;
  for (let i = 0; i < 40; i += 1) widest = zoomAt(widest, { x: 300, y: 300 }, 1 / ZOOM_STEP);
  let closest = framed;
  for (let i = 0; i < 12; i += 1) closest = zoomAt(closest, { x: 700, y: 450 }, ZOOM_STEP);

  /** Les bords du plateau à l'écran : ses coins, au sol et au sommet du relief. */
  function boardOnScreen(state: Camera): {
    left: number;
    right: number;
    top: number;
    bottom: number;
  } {
    const points = [
      { x: -0.5, y: -0.5 },
      { x: 8.5, y: -0.5 },
      { x: 8.5, y: 8.5 },
      { x: -0.5, y: 8.5 },
    ].flatMap((corner) => [screenOf(state, corner), screenOf(state, corner, NINE.relief)]);
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    return {
      left: Math.min(...xs),
      right: Math.max(...xs),
      top: Math.min(...ys),
      bottom: Math.max(...ys),
    };
  }

  it("mesure l'emprise du plateau et son relief", () => {
    expect(footprintOf(Board.fromAscii(["012", "000"]))).toEqual({ width: 3, depth: 2, relief: 2 });
    expect(footprintOf(new Board([]))).toEqual({ width: 1, depth: 1, relief: 0 });
  });

  it("dézoomé au plus loin, le plateau entier tient dans la zone libre", () => {
    expect(widest.scale).toBeLessThanOrEqual(framed.scale);
    const board = boardOnScreen(widest);
    expect(board.left).toBeGreaterThanOrEqual(INSETS.left - 0.5);
    expect(board.right).toBeLessThanOrEqual(VIEW.x - INSETS.right + 0.5);
    expect(board.top).toBeGreaterThanOrEqual(INSETS.top - 0.5);
    expect(board.bottom).toBeLessThanOrEqual(VIEW.y - INSETS.bottom + 0.5);
  });

  it("dézoomé au plus loin, le plateau ne se déplace plus", () => {
    expect(panBy(widest, 200, -150).pan).toEqual(widest.pan);
  });

  it("zoomé, on le parcourt, jusqu'à ce que son bord touche celui de la zone libre", () => {
    const moved = panBy(closest, 40, 0);
    expect(moved.pan.x).toBeCloseTo(closest.pan.x + 40);
    const far = panBy(closest, 100_000, 100_000);
    const board = boardOnScreen(far);
    expect(board.left).toBeCloseTo(INSETS.left);
    expect(board.top).toBeCloseTo(INSETS.top);
    const other = boardOnScreen(panBy(closest, -100_000, -100_000));
    expect(other.right).toBeCloseTo(VIEW.x - INSETS.right);
    expect(other.bottom).toBeCloseTo(VIEW.y - INSETS.bottom);
  });

  it("dézoomer ramène le plateau dans ses bornes", () => {
    const pushed = panBy(closest, 100_000, 0);
    let back = pushed;
    for (let i = 0; i < 40; i += 1) back = zoomAt(back, { x: 700, y: 450 }, 1 / ZOOM_STEP);
    expect(back.pan.x).toBeCloseTo(widest.pan.x);
    expect(back.pan.y).toBeCloseTo(widest.pan.y);
  });

  it("la colonne repliée, le plateau glisse vers le milieu de la place rendue", () => {
    const wider = withViewport(framed, VIEW, { scale: 1.25, insets: { ...INSETS, right: 16 } });
    expect(pivotOnScreen(wider).x).toBeCloseTo(pivotOnScreen(framed).x + (312 - 16) / 2);
  });
});
