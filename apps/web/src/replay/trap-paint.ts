import type { Board, Coord } from "@occulis/core";
import {
  type IsoProjection,
  type Quad,
  type ScreenPoint,
  project,
  tileQuad,
} from "@occulis/board/iso";
import { MOTION_FX, look } from "@occulis/board/theme";
import { fillQuad, pixelOf } from "@occulis/board/paint";
import { cssColor } from "@occulis/ui/tokens";
import { sparksOf, trapLayingAt, trapSpringAt } from "../view/effects.js";
import { scaleQuad, trapJawsOf, trapSealOf } from "../view/trap-shapes.js";

/**
 * Le piège dans le rejeu, en Canvas 2D : la même géométrie (`view/trap-shapes.ts`) et les
 * mêmes courbes (`view/effects.ts`) que `render/pixi/trap-fx.ts`, pour que l'historique
 * montre ce que les joueurs ont vu en partie.
 */

function topOf(board: Board, coord: Coord, proj: IsoProjection): Quad {
  return tileQuad(coord, board.heightAt(coord) ?? 0, proj);
}

function tracePath(context: CanvasRenderingContext2D, points: readonly ScreenPoint[]): void {
  context.beginPath();
  points.forEach((p, i) => (i === 0 ? context.moveTo(p.x, p.y) : context.lineTo(p.x, p.y)));
  context.closePath();
}

/** Le losange barré d'un piège, à l'échelle `k` de la case. */
export function paintTrapSeal(
  context: CanvasRenderingContext2D,
  quad: Quad,
  k: number,
  color: number,
  alpha: number,
): void {
  const { outline, cross } = trapSealOf(quad, k);
  context.lineWidth = pixelOf(context);
  tracePath(context, outline);
  context.strokeStyle = cssColor(color, alpha);
  context.stroke();
  context.beginPath();
  for (const [a, b] of cross) {
    context.moveTo(a.x, a.y);
    context.lineTo(b.x, b.y);
  }
  context.strokeStyle = cssColor(color, alpha * 0.6);
  context.stroke();
}

/** Un piège posé, à sa place sur le plateau. */
export function paintTrap(
  context: CanvasRenderingContext2D,
  board: Board,
  coord: Coord,
  proj: IsoProjection,
  alpha: number,
): void {
  paintTrapSeal(
    context,
    topOf(board, coord, proj),
    look().selection.trapMark,
    look().selection.trap,
    alpha,
  );
}

function spark(context: CanvasRenderingContext2D, at: ScreenPoint, size: number, color: string) {
  context.fillStyle = color;
  context.fillRect(at.x - size / 2, at.y - size / 2, size, size);
}

/** La pose : le sceau tombe sur la case, la case s'éclaire, les éclats s'y rassemblent. */
export function paintTrapLaying(
  context: CanvasRenderingContext2D,
  board: Board,
  coord: Coord,
  elapsed: number,
  proj: IsoProjection,
): void {
  const state = trapLayingAt(elapsed, MOTION_FX.trapLayMs);
  if (state === undefined) return;
  const quad = topOf(board, coord, proj);
  const color = look().selection.trap;
  const height = board.heightAt(coord) ?? 0;
  const px = pixelOf(context);

  fillQuad(context, quad, cssColor(color, 0.35 * state.flash));
  paintTrapSeal(context, quad, look().selection.trapMark * state.scale, color, state.alpha);
  for (const shard of sparksOf(MOTION_FX.sparks, coord.x * 31 + coord.y)) {
    const away = 1 - state.gather;
    const at = project(
      { x: coord.x + shard.dx * away * 1.6, y: coord.y + shard.dy * away * 1.6 },
      height + shard.rise * away,
      proj,
    );
    spark(
      context,
      at,
      px * (away > 0.5 ? 2 : 1),
      cssColor(color, state.alpha * (0.4 + 0.6 * away)),
    );
  }
}

/**
 * Le déclenchement, une fois la pièce sur la case : la case s'embrase, les mâchoires se
 * referment, une onde et des éclats partent, puis le sceau reste un instant en rouge.
 */
export function paintTrapSpring(
  context: CanvasRenderingContext2D,
  board: Board,
  coord: Coord,
  elapsed: number,
  proj: IsoProjection,
): void {
  const state = trapSpringAt(elapsed, MOTION_FX.trapSnapMs);
  if (state === undefined) return;
  const quad = topOf(board, coord, proj);
  const threat = look().state.threat;
  const height = board.heightAt(coord) ?? 0;
  const px = pixelOf(context);

  fillQuad(context, quad, cssColor(threat, 0.45 * state.flash));

  const jawAlpha = state.scar > 0 ? Math.min(1, state.scar * 1.6) : 1;
  context.lineWidth = px;
  for (const jaw of trapJawsOf(quad, state.jaws)) {
    tracePath(context, jaw);
    context.fillStyle = cssColor(threat, 0.8 * jawAlpha);
    context.fill();
    context.strokeStyle = cssColor(look().palette.ink, 0.7 * jawAlpha);
    context.stroke();
  }

  if (state.burst > 0 && state.burst < 1) {
    const t = state.burst;
    tracePath(context, scaleQuad(quad, 0.7 + t * 1.1));
    context.strokeStyle = cssColor(threat, (1 - t) ** 2);
    context.stroke();
    for (const shard of sparksOf(MOTION_FX.sparks + 4, coord.x * 17 + coord.y * 5)) {
      const at = project(
        { x: coord.x + shard.dx * t * 1.4, y: coord.y + shard.dy * t * 1.4 },
        height + shard.rise * Math.sin(Math.PI * Math.min(1, t * 1.2)),
        proj,
      );
      const color = t < 0.5 ? threat : look().selection.trap;
      spark(context, at, px * (t < 0.4 ? 2 : 1), cssColor(color, 1 - t));
    }
  }

  if (state.scar > 0) paintTrapSeal(context, quad, look().selection.trapMark, threat, state.scar);
}

/**
 * Ce qui reste d'un piège déclenché quand on arrive sur l'image sans l'animer (survol de
 * l'historique, mouvements réduits) : la case rougie et les mâchoires fermées.
 */
export function paintTrapSprung(
  context: CanvasRenderingContext2D,
  board: Board,
  coord: Coord,
  proj: IsoProjection,
): void {
  const quad = topOf(board, coord, proj);
  const threat = look().state.threat;
  fillQuad(context, quad, cssColor(threat, 0.18));
  context.lineWidth = pixelOf(context);
  for (const jaw of trapJawsOf(quad, 1)) {
    tracePath(context, jaw);
    context.fillStyle = cssColor(threat, 0.55);
    context.fill();
    context.strokeStyle = cssColor(look().palette.ink, 0.5);
    context.stroke();
  }
}
