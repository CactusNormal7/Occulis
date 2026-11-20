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
import { clamp01, easeInOutSine } from "./easing.js";

/**
 * État de caméra. Module pur : ni Pixi, ni DOM, ni événement — les entrées
 * viennent de `controls.ts`, la sortie est consommée par `scene.ts`.
 *
 * Deux vues : l'isométrique, libre (pan, zoom, rotation), et la **vue de dessus**, figée
 * et centrée (`togglePlanView()`, docs/design/rules.md § 8.1). La caméra garde l'état de
 * la vue libre pendant la vue de dessus : la quitter ramène exactement à ce qu'on avait.
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
/** La durée de la bascule entre les deux vues (la maquette `docs/mockups/ath/vue-plateau.html`). */
export const PLAN_VIEW_MS = 480;
/**
 * Le huitième de tour que prend le plateau en vue de dessus : la rangée qui descendait en
 * biais vers la gauche s'aligne sur le bas de l'écran, et les cases deviennent des carrés
 * droits. Le camp qu'on voyait devant soi reste donc en bas.
 */
const PLAN_TURN = Math.PI / 4;
/** La part de la zone libre que le plateau occupe en vue de dessus. */
const PLAN_FILL = 0.92;

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
  /** Le côté du plateau, en cases : de quoi le cadrer en entier en vue de dessus. */
  readonly span: number;
  /** La vue visée : `true` en vue de dessus. */
  readonly planView: boolean;
  /**
   * L'avancée de la bascule vers la vue de dessus, 0 → 1, linéaire dans le temps
   * (`settle()`). La courbe s'applique à la lecture (`flatnessOf()`).
   */
  readonly planProgress: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
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

/** Le côté du plateau en cases, le plus grand des deux : 9 pour une carte de 9 × 9. */
export function spanOf(board: Board): number {
  let span = 0;
  const tiles = [...board.allTiles()];
  for (const axis of ["x", "y"] as const) {
    const values = tiles.map((tile) => tile.coord[axis]);
    if (values.length > 0) span = Math.max(span, Math.max(...values) - Math.min(...values) + 1);
  }
  return Math.max(1, span);
}

/** `span`, le côté du plateau en cases, ne sert qu'à cadrer la vue de dessus. */
export function createCamera(
  pivot: Coord,
  viewport: ScreenPoint,
  home: Framing = PLAIN_FRAMING,
  span = 1,
): Camera {
  const camera = {
    scale: home.scale,
    pan: { x: 0, y: 0 },
    rotation: 0,
    targetRotation: 0,
    viewport,
    pivot,
    home,
    span,
    planView: false,
    planProgress: 0,
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
  return centeredPan(camera, projectionAt(camera, 0, camera.home.scale));
}

/** Le pan qui pose le pivot au milieu de la zone libre, pour une projection donnée. */
function centeredPan(camera: Camera, projection: IsoProjection): ScreenPoint {
  const { insets } = camera.home;
  const pivot = project(camera.pivot, 0, projection);
  return {
    x: (insets.left - insets.right) / 2 - pivot.x,
    y: (insets.top - insets.bottom) / 2 - pivot.y,
  };
}

/**
 * L'échelle de la vue de dessus : le plateau entier dans la zone libre. Une case y est
 * un carré de `tileWidth / √2` de côté (le losange isométrique redressé).
 */
function planScale(camera: Camera): number {
  const { insets } = camera.home;
  const free = Math.min(
    camera.viewport.x - insets.left - insets.right,
    camera.viewport.y - insets.top - insets.bottom,
  );
  const side = (camera.span * METRICS.tileWidth) / Math.SQRT2;
  return clamp((free * PLAN_FILL) / side, MIN_SCALE, MAX_SCALE);
}

/** Le pan de la vue de dessus : le plateau au milieu de la zone libre. */
function planPan(camera: Camera): ScreenPoint {
  return centeredPan(camera, projectionAt(camera, 1, planScale(camera)));
}

/**
 * Combien la vue est à plat, 0 (isométrique) → 1 (de dessus), la courbe appliquée :
 * c'est ce que lisent la projection et la scène (pièces centrées, relief en points).
 */
export function flatnessOf(camera: Camera): number {
  return easeInOutSine(camera.planProgress);
}

/**
 * La caméra figée : en vue de dessus ou en route vers elle ou depuis elle. Pan, zoom et
 * rotation n'y ont aucun effet — le plateau reste centré.
 */
export function isLocked(camera: Camera): boolean {
  return camera.planView || camera.planProgress > 0;
}

/** Entre dans la vue de dessus ou en sort ; l'angle se cale d'abord sur un quart de tour. */
export function togglePlanView(camera: Camera): Camera {
  return {
    ...camera,
    planView: !camera.planView,
    targetRotation: snapAngle(camera.targetRotation),
  };
}

/** Origine écran de la projection : centre du canevas, décalé du pan. */
export function originOf(camera: Camera): ScreenPoint {
  const flat = flatnessOf(camera);
  const pan = flat === 0 ? camera.pan : planPan(camera);
  return {
    x: camera.viewport.x / 2 + lerp(camera.pan.x, pan.x, flat),
    y: camera.viewport.y / 2 + lerp(camera.pan.y, pan.y, flat),
  };
}

/** Point écran vers l'espace de projection, dans lequel travaille `picking.ts`. */
export function toProjectionSpace(camera: Camera, point: ScreenPoint): ScreenPoint {
  const origin = originOf(camera);
  return { x: point.x - origin.x, y: point.y - origin.y };
}

/**
 * La projection que voit le joueur. Pendant la bascule vers la vue de dessus, trois choses
 * glissent ensemble : le plateau tourne d'un huitième de tour, les cases se déplient de
 * losanges en carrés (`tileHeight` rejoint `tileWidth`) et le relief s'aplatit
 * (`heightUnit` tombe à 0). L'échelle rejoint celle qui cadre le plateau entier.
 */
export function toProjection(camera: Camera): IsoProjection {
  const flat = flatnessOf(camera);
  const scale = flat === 0 ? camera.scale : lerp(camera.scale, planScale(camera), flat);
  return projectionAt(camera, flat, scale);
}

/** La projection à un degré d'aplatissement `flat` donné (0 isométrique, 1 de dessus). */
function projectionAt(camera: Camera, flat: number, scale: number): IsoProjection {
  return {
    tileWidth: METRICS.tileWidth,
    tileHeight: lerp(METRICS.tileHeight, METRICS.tileWidth, flat),
    heightUnit: lerp(METRICS.heightUnit, 0, flat),
    scale,
    rotation: camera.rotation - flat * PLAN_TURN,
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
  if (isLocked(camera)) return camera;
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
  if (isLocked(camera)) return camera;
  return { ...camera, pan: { x: camera.pan.x + dx, y: camera.pan.y + dy } };
}

/** Rotation libre : la cible suit l'angle courant, aucune aimantation en cours. */
export function rotateBy(camera: Camera, radians: number): Camera {
  if (isLocked(camera)) return camera;
  const rotation = camera.rotation + radians;
  return { ...camera, rotation, targetRotation: rotation };
}

/** Aimante l'angle courant sur le quart de tour le plus proche. */
export function snapRotation(camera: Camera): Camera {
  return { ...camera, targetRotation: snapAngle(camera.rotation) };
}

/** Vise le quart de tour voisin, dans le sens indiqué. */
export function turn(camera: Camera, direction: 1 | -1): Camera {
  if (isLocked(camera)) return camera;
  return { ...camera, targetRotation: snapAngle(camera.rotation) + direction * QUARTER_TURN };
}

/** Les boutons de caméra de l'ATH (`hud/CameraControls.vue`). */
export type CameraCommand =
  "plan-view" | "turn-left" | "turn-right" | "zoom-in" | "zoom-out" | "recenter";

/** Un clic de bouton zoome comme deux crans de molette : un cran seul se remarque à peine. */
export const BUTTON_ZOOM = ZOOM_STEP ** 2;

/**
 * Les gestes des boutons de caméra : ceux des flèches et de la molette, le zoom centré
 * sur la zone visible faute de curseur. Recentrer revient au cadrage de départ
 * (`home`), sans toucher à l'angle choisi. Seule la bascule de vue agit sur une caméra
 * figée.
 */
export function commandCamera(camera: Camera, command: CameraCommand): Camera {
  if (command === "plan-view") return togglePlanView(camera);
  if (isLocked(camera)) return camera;
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

/** Une image de plus : la bascule de vue avance, l'angle rejoint sa cible. */
export function settle(camera: Camera, deltaMS: number): Camera {
  return settleRotation(settlePlanView(camera, deltaMS), deltaMS);
}

function settlePlanView(camera: Camera, deltaMS: number): Camera {
  const target = camera.planView ? 1 : 0;
  if (camera.planProgress === target) return camera;
  const step = (deltaMS / PLAN_VIEW_MS) * (target === 1 ? 1 : -1);
  return { ...camera, planProgress: clamp01(camera.planProgress + step) };
}

function settleRotation(camera: Camera, deltaMS: number): Camera {
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
