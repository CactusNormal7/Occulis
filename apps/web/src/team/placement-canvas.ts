import type { Board, Coord, PieceKind, PlayerId } from "@occulis/core";
import { INK, cssColor } from "@occulis/ui/tokens";
import { type Drawable, drawPiece, fillQuad, strokeQuad, terrainDrawables } from "../canvas/paint.js";
import { centerOffset, fitScale } from "../admin/replay.js";
import { METRICS, PIECES, PLAYERS, STATE } from "../theme.js";
import { type Camera, createCamera, pivotOf, settle, toProjection, turn } from "../view/camera.js";
import { compareDepth, depthOf, project, tileQuad } from "../view/iso.js";
import { tileAt } from "../view/picking.js";

/**
 * Le plateau du déploiement, en Canvas 2D comme le rejeu (`admin/replay-canvas.ts`) et
 * avec la même géométrie que le jeu : la page du jeu n'a pas encore de partie à donner à
 * PixiJS, et le même plateau sert aussi à préparer une équipe hors partie (`teams/`).
 *
 * Ce qui y est **information de partie** prend une couleur, comme partout : la zone du
 * joueur dans la teinte de son camp, celle d'en face en pointillé dans la sienne, la pièce
 * en main dans la teinte de la sélection. Les pièces portent l'initiale de leur type —
 * le seul endroit où elles se distinguent, puisqu'on les choisit ici.
 */
export interface PlacedPiece {
  readonly coord: Coord;
  readonly kind: PieceKind;
  readonly selected: boolean;
}

export interface PlacementState {
  readonly side: PlayerId;
  readonly zone: readonly Coord[];
  /** Absente hors partie : on prépare une équipe sans adversaire. */
  readonly opponentZone: readonly Coord[];
  readonly pieces: readonly PlacedPiece[];
  /** L'initiale qui marque un type de pièce, dans la langue courante. */
  readonly initialOf: (kind: PieceKind) => string;
}

export interface PlacementCanvas {
  update(state: PlacementState): void;
  rotate(direction: 1 | -1): void;
  destroy(): void;
}

const PADDING = 24;

export function mountPlacement(canvas: HTMLCanvasElement, board: Board, side: PlayerId, onPick: (coord: Coord) => void): PlacementCanvas {
  const context = canvas.getContext("2d");
  const base = { tileWidth: METRICS.tileWidth, tileHeight: METRICS.tileHeight, heightUnit: METRICS.heightUnit, pivot: pivotOf(board) };
  let camera: Camera = createCamera(base.pivot, { x: 0, y: 0 });
  // Le camp B regarde la carte depuis l'autre côté : sa zone se présente à gauche, comme
  // celle du camp A.
  if (side === "B") {
    camera = turn(turn(camera, 1), 1);
    camera = { ...camera, rotation: camera.targetRotation };
  }
  let state: PlacementState | undefined;
  let hovered: Coord | undefined;
  let frameRequest: number | undefined;
  let last = 0;

  const resize = (): void => {
    if (!canvas.isConnected) {
      observer.disconnect();
      return;
    }
    const ratio = window.devicePixelRatio || 1;
    const { width, height } = canvas.getBoundingClientRect();
    if (width === 0 || height === 0) return;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    camera = { ...camera, viewport: { x: width, y: height }, scale: fitScale(board, base, width, height, PADDING) };
    draw();
  };

  /** Le point du canevas, ramené dans l'espace de la projection où `tileAt` cherche. */
  const pick = (event: PointerEvent): Coord | undefined => {
    if (camera.viewport.x === 0) return undefined;
    const rect = canvas.getBoundingClientRect();
    const proj = toProjection(camera);
    const offset = centerOffset(board, proj);
    return tileAt(
      { x: event.clientX - rect.left - camera.viewport.x / 2 - offset.x, y: event.clientY - rect.top - camera.viewport.y / 2 - offset.y },
      board,
      proj,
    );
  };

  const onMove = (event: PointerEvent): void => {
    const next = pick(event);
    if (next?.x === hovered?.x && next?.y === hovered?.y) return;
    hovered = next;
    canvas.style.cursor = next === undefined ? "default" : "pointer";
    draw();
  };
  const onLeave = (): void => {
    hovered = undefined;
    draw();
  };
  const onClick = (event: PointerEvent): void => {
    const coord = pick(event);
    if (coord !== undefined) onPick(coord);
  };
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("pointerup", onClick);

  const tick = (now: number): void => {
    const delta = last === 0 ? 16 : now - last;
    last = now;
    camera = settle(camera, delta);
    draw();
    if (camera.rotation !== camera.targetRotation) frameRequest = requestAnimationFrame(tick);
    else {
      frameRequest = undefined;
      last = 0;
    }
  };

  function draw(): void {
    if (context === null || camera.viewport.x === 0 || state === undefined) return;
    const current = state;
    const ratio = canvas.width / camera.viewport.x;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, camera.viewport.x, camera.viewport.y);
    const proj = toProjection(camera);
    const offset = centerOffset(board, proj);
    context.translate(camera.viewport.x / 2 + offset.x, camera.viewport.y / 2 + offset.y);

    const own = new Set(current.zone.map((coord) => `${coord.x},${coord.y}`));
    const theirs = new Set(current.opponentZone.map((coord) => `${coord.x},${coord.y}`));
    const camp = PLAYERS[current.side];
    const other = PLAYERS[current.side === "A" ? "B" : "A"];

    const drawables: Drawable[] = terrainDrawables(context, board, proj, () => true, (coord, height) => {
      const key = `${coord.x},${coord.y}`;
      const quad = tileQuad(coord, height, proj);
      if (own.has(key)) {
        fillQuad(context, quad, cssColor(camp, 0.1));
        strokeQuad(context, quad, cssColor(camp, 0.55), 1);
      } else if (theirs.has(key)) {
        context.setLineDash([3, 4]);
        strokeQuad(context, quad, cssColor(other, 0.35), 1);
        context.setLineDash([]);
      }
      if (hovered !== undefined && hovered.x === coord.x && hovered.y === coord.y) {
        strokeQuad(context, quad, own.has(key) ? cssColor(STATE.selection) : cssColor(INK, 0.4), 2);
      }
    });

    for (const piece of current.pieces) {
      const height = board.heightAt(piece.coord) ?? 0;
      drawables.push({
        depth: { ...depthOf(piece.coord, height, proj), height: height + 0.5 },
        paint: () => {
          const color = piece.selected ? cssColor(STATE.selection) : cssColor(camp, PIECES.alphaVisible);
          const top = drawPiece(context, project(piece.coord, height, proj), current.side, PIECES.alphaVisible, proj, color);
          context.fillStyle = color;
          context.font = `${Math.max(9, Math.round(11 * proj.scale))}px ui-monospace, monospace`;
          context.textAlign = "center";
          context.textBaseline = "bottom";
          context.fillText(current.initialOf(piece.kind), top.x, top.y - 2);
        },
      });
    }

    drawables.sort((a, b) => compareDepth(a.depth, b.depth));
    for (const drawable of drawables) drawable.paint();
  }

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  return {
    update(next) {
      state = next;
      draw();
    },
    rotate(direction) {
      camera = turn(camera, direction);
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) camera = { ...camera, rotation: camera.targetRotation };
      if (frameRequest === undefined) frameRequest = requestAnimationFrame(tick);
    },
    destroy() {
      observer.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointerup", onClick);
      if (frameRequest !== undefined) cancelAnimationFrame(frameRequest);
    },
  };
}
