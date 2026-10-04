import type { Board, Coord, PlayerId } from "@occulis/core";
import type { AdminFrame } from "@occulis/protocol";
import { GEOMETRY, METRICS, PIECES, PLAYERS, STATE } from "../theme.js";
import { cssColor } from "../ui/palette.js";
import { type Camera, createCamera, pivotOf, settle, toProjection, turn } from "../view/camera.js";
import { type MoveAnimation, advance, positionOf, startMove } from "../view/animation.js";
import { type IsoProjection, type Quad, type ScreenPoint, cliffQuads, compareDepth, depthOf, project, tileQuad } from "../view/iso.js";
import { centerOffset, fitScale, movesBetween, type Perspective } from "./replay.js";

/**
 * Le plateau du rejeu, dessiné en Canvas 2D et non en PixiJS : le back-office ne charge
 * pas le moteur. Il reprend pourtant **la même géométrie** que le jeu — projection
 * (`view/iso.ts`), caméra et quart de tour amorti (`view/camera.ts`), glissement des
 * pièces (`view/animation.ts`), métriques et code couleur (`theme.ts`) — pour que ce
 * que l'administrateur voit soit ce que les joueurs ont vu.
 *
 * Une seule différence de fond : le jeu ne dessine jamais une pièce hors LOS, le rejeu
 * les dessine toutes. Sous le point de vue d'un camp, celles qu'il ne voyait pas
 * restent visibles, en fantôme, pour que l'administrateur lise ce qui était caché.
 */

export interface ReplayCanvas {
  /** Montre l'image `index`, en faisant glisser les pièces si `animate`. */
  show(index: number, animate: boolean): void;
  setPerspective(perspective: Perspective): void;
  rotate(direction: 1 | -1): void;
}

const PADDING = 28;

export function mountReplay(canvas: HTMLCanvasElement, board: Board, frames: readonly AdminFrame[]): ReplayCanvas {
  const context = canvas.getContext("2d");
  const base = {
    tileWidth: METRICS.tileWidth,
    tileHeight: METRICS.tileHeight,
    heightUnit: METRICS.heightUnit,
    pivot: pivotOf(board),
  };

  let index = frames.length - 1;
  let perspective: Perspective = "all";
  let camera: Camera = createCamera(base.pivot, { x: 0, y: 0 });
  let moving: MoveAnimation[] = [];
  let frameRequest: number | undefined;
  let last = 0;

  const resize = () => {
    // La vue a été remplacée : plus rien à observer, ni à dessiner.
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

  const tick = (now: number) => {
    const delta = last === 0 ? 16 : now - last;
    last = now;
    camera = settle(camera, delta);
    moving = moving.flatMap((animation) => advance(animation, delta) ?? []);
    draw();
    if (moving.length > 0 || camera.rotation !== camera.targetRotation) frameRequest = requestAnimationFrame(tick);
    else {
      frameRequest = undefined;
      last = 0;
    }
  };

  const animateLoop = () => {
    if (frameRequest === undefined) frameRequest = requestAnimationFrame(tick);
  };

  function draw(): void {
    if (context === null || camera.viewport.x === 0) return;
    const frame = frames[index];
    if (frame === undefined) return;
    const ratio = canvas.width / camera.viewport.x;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, camera.viewport.x, camera.viewport.y);

    const proj = toProjection(camera);
    const offset = centerOffset(board, proj);
    context.translate(camera.viewport.x / 2 + offset.x, camera.viewport.y / 2 + offset.y);

    const sight: ReadonlySet<string> | undefined = perspective === "all" ? undefined : new Set(frame.visible[perspective]);
    const previous = frames[index - 1];
    const moves = previous === undefined ? [] : movesBetween(previous, frame);
    const gliding = new Map(moving.map((animation) => [animation.pieceId, positionOf(animation)]));

    // Un seul ordre du peintre pour le relief et les pièces, comme `scene.ts` : une pièce
    // derrière un mur doit être recouverte par lui.
    const drawables: { depth: ReturnType<typeof depthOf>; paint: () => void }[] = [];
    let near = -Infinity;
    let far = Infinity;
    for (const tile of board.allTiles()) {
      const depth = depthOf(tile.coord, tile.height, proj);
      near = Math.max(near, depth.plane);
      far = Math.min(far, depth.plane);
      drawables.push({
        depth,
        paint: () => {
          const nearness = near === far ? 1 : (depth.plane - far) / (near - far);
          const lit = sight === undefined || sight.has(`${tile.coord.x},${tile.coord.y}`);
          const alpha =
            (lit ? GEOMETRY.alphaVisible : GEOMETRY.alphaFogged) *
            (tile.passable ? 1 : GEOMETRY.impassableFactor) *
            (GEOMETRY.depthFadeFar + (GEOMETRY.depthFadeNear - GEOMETRY.depthFadeFar) * nearness);
          for (const cliff of cliffQuads(board, tile.coord, tile.height, proj)) {
            strokeQuad(context, cliff, cssColor(GEOMETRY.stroke, alpha), GEOMETRY.widthCliff);
          }
          strokeQuad(context, tileQuad(tile.coord, tile.height, proj), cssColor(GEOMETRY.stroke, alpha), GEOMETRY.widthTop);
        },
      });
    }

    for (const piece of frame.pieces) {
      const glide = gliding.get(piece.id);
      const coord: Coord = glide?.coord ?? { x: piece.x, y: piece.y };
      const height = glide?.height ?? board.heightAt(coord) ?? 0;
      const seen = sight === undefined || piece.owner === perspective || sight.has(`${piece.x},${piece.y}`);
      drawables.push({
        // Au-dessus de sa propre case dans l'ordre du peintre, jamais derrière elle.
        depth: { ...depthOf(coord, height, proj), height: height + 0.5 },
        paint: () =>
          drawPiece(context, project(coord, height, proj), piece.owner, seen ? PIECES.alphaVisible : PIECES.alphaGhost, proj),
      });
    }

    drawables.sort((a, b) => compareDepth(a.depth, b.depth));

    for (const drawable of drawables) drawable.paint();

    // Le dernier coup se dessine par-dessus le relief : dessous, son pointillé se perdait
    // dans les traits blancs des cases. Départ en pointillé, trajet dans la couleur du
    // camp, arrivée dans la teinte de la sélection, comme une pièce choisie en partie.
    for (const move of moves) {
      const fromHeight = board.heightAt(move.from) ?? 0;
      const toHeight = board.heightAt(move.to) ?? 0;
      context.setLineDash([4, 4]);
      strokeQuad(context, tileQuad(move.from, fromHeight, proj), cssColor(STATE.selection, 0.7), 1.5);
      const a = project(move.from, fromHeight, proj);
      const b = project(move.to, toHeight, proj);
      context.beginPath();
      context.moveTo(a.x, a.y);
      context.lineTo(b.x, b.y);
      context.strokeStyle = cssColor(PLAYERS[move.owner], 0.6);
      context.lineWidth = 1.5;
      context.stroke();
      context.setLineDash([]);
    }

    for (const move of moves) {
      const quad = tileQuad(move.to, board.heightAt(move.to) ?? 0, proj);
      fillQuad(context, quad, cssColor(STATE.selection, 0.1));
      strokeQuad(context, quad, cssColor(STATE.selection), 2);
    }
  }

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  return {
    show(next, animate) {
      if (next === index || frames[next] === undefined) return;
      const from = frames[index];
      const to = frames[next];
      index = next;
      moving = [];
      if (animate && from !== undefined && to !== undefined && !reducedMotion()) {
        moving = movesBetween(from, to).map((move) => startMove(move.pieceId, move.from, move.to, board));
      }
      if (moving.length > 0) animateLoop();
      else draw();
    },
    setPerspective(next) {
      perspective = next;
      draw();
    },
    rotate(direction) {
      camera = turn(camera, direction);
      if (reducedMotion()) camera = { ...camera, rotation: camera.targetRotation };
      animateLoop();
    },
  };
}

function reducedMotion(): boolean {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function trace(context: CanvasRenderingContext2D, quad: Quad): void {
  context.beginPath();
  quad.forEach((point, i) => (i === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y)));
  context.closePath();
}

function strokeQuad(context: CanvasRenderingContext2D, quad: Quad, color: string, width: number): void {
  trace(context, quad);
  context.strokeStyle = color;
  context.lineWidth = width;
  context.stroke();
}

function fillQuad(context: CanvasRenderingContext2D, quad: Quad, color: string): void {
  trace(context, quad);
  context.fillStyle = color;
  context.fill();
}

/** La silhouette de `scene/pieces.ts` — tige et tête en losange — tracée en Canvas 2D. */
function drawPiece(
  context: CanvasRenderingContext2D,
  base: ScreenPoint,
  owner: PlayerId,
  alpha: number,
  proj: IsoProjection,
): void {
  const stem = proj.heightUnit * proj.scale * PIECES.stemRatio;
  const half = proj.tileWidth * proj.scale * PIECES.headRatio;
  const head = base.y - stem;
  context.strokeStyle = cssColor(PLAYERS[owner], alpha);
  context.lineWidth = PIECES.strokeWidth;

  context.beginPath();
  context.moveTo(base.x, base.y);
  context.lineTo(base.x, head);
  context.stroke();

  context.beginPath();
  context.moveTo(base.x, head - half * 0.9);
  context.lineTo(base.x + half, head);
  context.lineTo(base.x, head + half * 0.9);
  context.lineTo(base.x - half, head);
  context.closePath();
  context.stroke();
}
