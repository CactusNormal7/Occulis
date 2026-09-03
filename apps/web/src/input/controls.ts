import { type Coord, coordEquals } from "@occulis/core";
import {
  type Camera,
  RADIANS_PER_PIXEL,
  ZOOM_STEP,
  panBy,
  rotateBy,
  snapRotation,
  turn,
  zoomAt,
} from "../view/camera.js";
import type { ScreenPoint } from "../view/iso.js";

/**
 * Seul module du client qui écoute des événements. Il ne dessine rien et ne
 * détient aucun état de rendu : il traduit les gestes en transformations de
 * caméra et en intention de survol.
 */

export interface ControlsOptions {
  readonly canvas: HTMLCanvasElement;
  readonly getCamera: () => Camera;
  readonly setCamera: (camera: Camera) => void;
  /** Point écran vers la case désignée, hauteur comprise. */
  readonly pickTile: (point: ScreenPoint) => Coord | undefined;
  readonly setHovered: (coord: Coord | undefined) => void;
  /** Case désignée par un clic ; `undefined` si le clic tombe hors du plateau. */
  readonly onPick: (coord: Coord | undefined) => void;
  readonly toggleViewer: () => void;
}

type DragKind = "pan" | "rotate";

/**
 * Un pan et un clic partent du même bouton. En deçà de ce déplacement cumulé, le
 * geste est lu comme un clic — sans quoi la moindre tremblote de souris pendant
 * l'appui annulerait la désignation.
 */
const CLICK_SLOP = 4;

interface Drag {
  readonly kind: DragKind;
  readonly pointerId: number;
  x: number;
  y: number;
  /** Déplacement cumulé depuis l'appui, en pixels. */
  travelled: number;
}

/** Gauche : déplacement. Droit ou milieu : rotation libre. */
function dragKindOf(button: number): DragKind | undefined {
  if (button === 0) return "pan";
  if (button === 1 || button === 2) return "rotate";
  return undefined;
}

/**
 * Les raccourcis clavier sont posés sur `window` pour rester actifs hors du
 * canevas ; ils doivent donc s'effacer devant une saisie en cours, sans quoi une
 * espace tapée dans le champ de commande changerait de point de vue.
 */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

function sameCoord(a: Coord | undefined, b: Coord | undefined): boolean {
  if (a === undefined || b === undefined) return a === b;
  return coordEquals(a, b);
}

export function attachControls(options: ControlsOptions): void {
  const { canvas, getCamera, setCamera, pickTile, setHovered, onPick, toggleViewer } = options;

  let drag: Drag | undefined;
  let hovered: Coord | undefined;

  const update = (transform: (camera: Camera) => Camera): void => {
    setCamera(transform(getCamera()));
  };

  const pointOf = (event: MouseEvent): ScreenPoint => {
    const bounds = canvas.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  };

  const refreshHover = (point: ScreenPoint): void => {
    const next = pickTile(point);
    if (sameCoord(next, hovered)) return;
    hovered = next;
    setHovered(next);
  };

  canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      // Seul le signe est fiable : `deltaY` dépend de `deltaMode` et du périphérique.
      const factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      update((camera) => zoomAt(camera, pointOf(event), factor));
      refreshHover(pointOf(event));
    },
    { passive: false },
  );

  canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });

  canvas.addEventListener("pointerdown", (event) => {
    const kind = dragKindOf(event.button);
    if (kind === undefined) return;
    canvas.setPointerCapture(event.pointerId);
    drag = { kind, pointerId: event.pointerId, x: event.clientX, y: event.clientY, travelled: 0 };
  });

  canvas.addEventListener("pointermove", (event) => {
    if (drag !== undefined && drag.pointerId === event.pointerId) {
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      drag.x = event.clientX;
      drag.y = event.clientY;
      drag.travelled += Math.abs(dx) + Math.abs(dy);

      if (drag.kind === "pan") update((camera) => panBy(camera, dx, dy));
      else update((camera) => rotateBy(camera, dx * RADIANS_PER_PIXEL));
    }
    refreshHover(pointOf(event));
  });

  const endDrag = (event: PointerEvent): void => {
    if (drag === undefined || drag.pointerId !== event.pointerId) return;
    // L'aimantation ne se déclenche qu'au relâchement d'une rotation à la main.
    if (drag.kind === "rotate") update(snapRotation);
    // Un pan qui n'a presque pas bougé est un clic : il désigne la case visée.
    if (drag.kind === "pan" && drag.travelled <= CLICK_SLOP) onPick(pickTile(pointOf(event)));
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    drag = undefined;
  };

  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  canvas.addEventListener("pointerleave", () => {
    if (hovered === undefined) return;
    hovered = undefined;
    setHovered(undefined);
  });

  window.addEventListener("keydown", (event) => {
    if (isTyping(event.target)) return;
    if (event.key === "ArrowLeft") update((camera) => turn(camera, -1));
    else if (event.key === "ArrowRight") update((camera) => turn(camera, 1));
    else if (event.key === " ") toggleViewer();
    else return;
    event.preventDefault();
  });
}
