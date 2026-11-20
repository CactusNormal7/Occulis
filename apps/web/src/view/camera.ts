import type { Board, Coord } from "@occulis/core";
import {
  type IsoProjection,
  type ScreenPoint,
  QUARTER_TURN,
  lerpAngle,
  project,
  snapAngle,
} from "@occulis/board/iso";
import { METRICS } from "@occulis/board/theme";

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

/** Les bords de l'écran couverts par une interface posée sur le plateau (l'ATH), en pixels. */
export interface ScreenInsets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export const NO_INSETS: ScreenInsets = { top: 0, right: 0, bottom: 0, left: 0 };

/**
 * Le cadrage de départ, où ramène le recentrage : le plateau au milieu de ce que les
 * panneaux laissent voir, à une échelle donnée.
 */
export interface Framing {
  readonly scale: number;
  readonly insets: ScreenInsets;
}

/** Sans panneau ni zoom : le centre du canevas, à l'échelle 1. */
export const PLAIN_FRAMING: Framing = { scale: 1, insets: NO_INSETS };

export interface Camera {
  readonly scale: number;
  /** Décalage utilisateur par rapport au centre du canevas. */
  readonly pan: ScreenPoint;
  readonly rotation: number;
  /** Angle visé par l'aimantation ; égal à `rotation` tant qu'on tourne à la main. */
  readonly targetRotation: number;
  readonly viewport: ScreenPoint;
  readonly pivot: Coord;
  /** Le cadrage de départ, gardé pour que le recentrage y revienne. */
  readonly home: Framing;
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

export function createCamera(
  pivot: Coord,
  viewport: ScreenPoint,
  home: Framing = PLAIN_FRAMING,
): Camera {
  const camera = {
    scale: home.scale,
    pan: { x: 0, y: 0 },
    rotation: 0,
    targetRotation: 0,
    viewport,
    pivot,
    home,
  };
  return { ...camera, pan: homePan(camera) };
}

/**
 * Le pan qui pose le centre du plateau au milieu de la zone que les bords couverts
 * laissent libre.
 *
 * Deux décalages s'ajoutent. La zone libre : son milieu s'écarte de celui du canevas de
 * la moitié de l'écart entre bords opposés — 312 px couverts à droite déplacent le
 * plateau de 156 px à gauche. Le pivot : la projection pose la case logique (0, 0), et
 * non le pivot, sur l'origine ; le centre d'un plateau de 9 × 9 tombe ainsi bien plus bas
 * que l'origine, et il faut le remonter d'autant. La rotation tourne autour du pivot, qui
 * ne bouge donc pas d'un angle à l'autre.
 */
function homePan(camera: Camera): ScreenPoint {
  const { insets } = camera.home;
  const pivot = project(camera.pivot, 0, toProjection({ ...camera, scale: camera.home.scale }));
  return {
    x: (insets.left - insets.right) / 2 - pivot.x,
    y: (insets.top - insets.bottom) / 2 - pivot.y,
  };
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

/** Les boutons de caméra de l'ATH (`hud/CameraControls.vue`). */
export type CameraCommand = "turn-left" | "turn-right" | "zoom-in" | "zoom-out" | "recenter";

/** Un clic de bouton zoome comme deux crans de molette : un cran seul se remarque à peine. */
export const BUTTON_ZOOM = ZOOM_STEP ** 2;

/**
 * Les gestes des boutons de caméra : ceux des flèches et de la molette, le zoom centré
 * sur la zone visible faute de curseur. Recentrer revient au cadrage de départ
 * (`home`), sans toucher à l'angle choisi.
 */
export function commandCamera(camera: Camera, command: CameraCommand): Camera {
  const { insets } = camera.home;
  const middle = {
    x: insets.left + (camera.viewport.x - insets.left - insets.right) / 2,
    y: insets.top + (camera.viewport.y - insets.top - insets.bottom) / 2,
  };
  switch (command) {
    case "turn-left":
      return turn(camera, -1);
    case "turn-right":
      return turn(camera, 1);
    case "zoom-in":
      return zoomAt(camera, middle, BUTTON_ZOOM);
    case "zoom-out":
      return zoomAt(camera, middle, 1 / BUTTON_ZOOM);
    case "recenter":
      return { ...camera, scale: camera.home.scale, pan: homePan(camera) };
  }
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
