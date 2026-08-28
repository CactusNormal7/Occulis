import type { Board, Coord } from "@occulis/core";
import { type IsoProjection, type ScreenPoint, QUARTER_TURN, lerpAngle, snapAngle } from "./iso.js";
import { METRICS } from "./theme.js";

/**
 * État de caméra. Module pur : ni Pixi, ni DOM, ni événement — les entrées
 * viennent de `controls.ts`, la sortie est consommée par `scene.ts`.
 */

const MIN_SCALE = 0.35;
const MAX_SCALE = 3;
/** Facteur appliqué par cran de molette. */
export const ZOOM_STEP = 1.12;
/** Radians par pixel de déplacement horizontal pendant une rotation au drag. */
export const RADIANS_PER_PIXEL = 0.008;
const SETTLE_MS = 120;
/** En deçà, l'interpolation asymptotique n'est plus perceptible : on cale l'angle. */
const SETTLE_EPSILON = 1e-4;

export interface Camera {
  readonly scale: number;
  /** Décalage utilisateur par rapport au centre du canevas. */
  readonly pan: ScreenPoint;
  readonly rotation: number;
  /** Angle visé par l'aimantation ; égal à `rotation` tant qu'on tourne à la main. */
  readonly targetRotation: number;
  readonly viewport: ScreenPoint;
  readonly pivot: Coord;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Centre logique du plateau. `Board` n'expose pas de bornes : il faut balayer
 * les cases une fois.
 */
export function pivotOf(board: Board): Coord {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const tile of board.allTiles()) {
    minX = Math.min(minX, tile.coord.x);
    maxX = Math.max(maxX, tile.coord.x);
    minY = Math.min(minY, tile.coord.y);
    maxY = Math.max(maxY, tile.coord.y);
  }

  if (minX > maxX) return { x: 0, y: 0 };
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
}

export function createCamera(pivot: Coord, viewport: ScreenPoint): Camera {
  return { scale: 1, pan: { x: 0, y: 0 }, rotation: 0, targetRotation: 0, viewport, pivot };
}

/** Origine écran de la projection : centre du canevas, décalé du pan. */
export function originOf(camera: Camera): ScreenPoint {
  return {
    x: camera.viewport.x / 2 + camera.pan.x,
    y: camera.viewport.y / 2 + camera.pan.y,
  };
}

/** Point écran vers l'espace de projection, dans lequel travaille `picking.ts`. */
export function toProjectionSpace(camera: Camera, point: ScreenPoint): ScreenPoint {
  const origin = originOf(camera);
  return { x: point.x - origin.x, y: point.y - origin.y };
}

export function toProjection(camera: Camera): IsoProjection {
  return {
    tileWidth: METRICS.tileWidth,
    tileHeight: METRICS.tileHeight,
    heightUnit: METRICS.heightUnit,
    scale: camera.scale,
    rotation: camera.rotation,
    pivot: camera.pivot,
  };
}

export function withViewport(camera: Camera, viewport: ScreenPoint): Camera {
  return { ...camera, viewport };
}

/**
 * Zoom vers le curseur : le point du monde situé sous `point` ne bouge pas à
 * l'écran. L'espace de projection étant linéaire en `scale`, compenser revient
 * à décaler le pan de la fraction d'échelle gagnée.
 */
export function zoomAt(camera: Camera, point: ScreenPoint, factor: number): Camera {
  const scale = clamp(camera.scale * factor, MIN_SCALE, MAX_SCALE);
  if (scale === camera.scale) return camera;

  const ratio = scale / camera.scale;
  const anchor = toProjectionSpace(camera, point);
  return {
    ...camera,
    scale,
    pan: {
      x: camera.pan.x + anchor.x * (1 - ratio),
      y: camera.pan.y + anchor.y * (1 - ratio),
    },
  };
}

export function panBy(camera: Camera, dx: number, dy: number): Camera {
  return { ...camera, pan: { x: camera.pan.x + dx, y: camera.pan.y + dy } };
}

/** Rotation libre : la cible suit l'angle courant, aucune aimantation en cours. */
export function rotateBy(camera: Camera, radians: number): Camera {
  const rotation = camera.rotation + radians;
  return { ...camera, rotation, targetRotation: rotation };
}

/** Aimante l'angle courant sur le quart de tour le plus proche. */
export function snapRotation(camera: Camera): Camera {
  return { ...camera, targetRotation: snapAngle(camera.rotation) };
}

/** Vise le quart de tour voisin, dans le sens indiqué. */
export function turn(camera: Camera, direction: 1 | -1): Camera {
  return { ...camera, targetRotation: snapAngle(camera.rotation) + direction * QUARTER_TURN };
}

export function settle(camera: Camera, deltaMS: number): Camera {
  if (camera.rotation === camera.targetRotation) return camera;

  const rotation = lerpAngle(
    camera.rotation,
    camera.targetRotation,
    Math.min(1, deltaMS / SETTLE_MS),
  );
  if (Math.abs(camera.targetRotation - rotation) < SETTLE_EPSILON) {
    return { ...camera, rotation: camera.targetRotation };
  }
  return { ...camera, rotation };
}
