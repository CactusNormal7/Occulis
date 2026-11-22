import type { Graphics } from "pixi.js";
import type { Board, Coord } from "@occulis/core";
import { type IsoProjection, type Quad, project } from "@occulis/board/iso";
import { MOTION_FX, look } from "@occulis/board/theme";
import { phase } from "../../view/easing.js";
import { sparksOf, trapLayingAt, trapSpringAt } from "../../view/effects.js";
import { trapJawsOf, trapSealOf } from "../../view/trap-shapes.js";
import { scaled, topOf } from "./overlay.js";

/**
 * Les effets du piège, peints dans la couche du dessus (`scene.ts`, `drawOverlay`) : la
 * pose, le geste adverse aperçu, et le déclenchement. Les courbes viennent de
 * `view/effects.ts` ; ici, seulement le dessin. La pièce happée elle-même est dessinée
 * avec les autres pièces, dans l'ordre du peintre du monde.
 */

/** Le losange barré d'un piège, à l'échelle `k` de la case. */
function trapSeal(g: Graphics, quad: Quad, k: number, color: number, alpha: number, px: number) {
  const { outline, cross } = trapSealOf(quad, k);
  g.poly(outline).stroke({ width: px, color, alpha });
  for (const [a, b] of cross) g.moveTo(a.x, a.y).lineTo(b.x, b.y);
  g.stroke({ width: px, color, alpha: alpha * 0.6 });
}

/** Des éclats carrés d'un pixel ou deux, comme ceux d'une retombée. */
function spark(
  g: Graphics,
  at: { x: number; y: number },
  size: number,
  color: number,
  alpha: number,
) {
  g.rect(at.x - size / 2, at.y - size / 2, size, size).fill({ color, alpha });
}

/** La pose : le sceau tombe sur la case, la case s'éclaire, les éclats s'y rassemblent. */
export function drawTrapLaying(
  g: Graphics,
  board: Board,
  coord: Coord,
  elapsed: number,
  proj: IsoProjection,
  px: number,
): void {
  const state = trapLayingAt(elapsed, MOTION_FX.trapLayMs);
  const quad = topOf(board, coord, proj);
  if (state === undefined || quad === undefined) return;
  const color = look().selection.trap;
  const height = board.heightAt(coord) ?? 0;

  g.poly(scaled(quad, 1)).fill({ color, alpha: 0.35 * state.flash });
  trapSeal(g, quad, look().selection.trapMark * state.scale, color, state.alpha, px);
  for (const shard of sparksOf(MOTION_FX.sparks, coord.x * 31 + coord.y)) {
    const away = 1 - state.gather;
    const at = project(
      { x: coord.x + shard.dx * away * 1.6, y: coord.y + shard.dy * away * 1.6 },
      height + shard.rise * away,
      proj,
    );
    spark(g, at, px * (away > 0.5 ? 2 : 1), color, state.alpha * (0.4 + 0.6 * away));
  }
}

/**
 * Le geste de l'adversaire, vu sans savoir où il a posé : deux ondes de sa couleur
 * autour de la pièce, et rien sur les cases voisines.
 */
export function drawTrapGlimpse(
  g: Graphics,
  board: Board,
  coord: Coord,
  color: number,
  elapsed: number,
  proj: IsoProjection,
  px: number,
): void {
  const quad = topOf(board, coord, proj);
  if (quad === undefined || elapsed < 0 || elapsed > MOTION_FX.trapGlimpseMs) return;
  for (const delay of [0, 0.3]) {
    const t = phase(elapsed, delay * MOTION_FX.trapGlimpseMs, 0.7 * MOTION_FX.trapGlimpseMs);
    if (t <= 0 || t >= 1) continue;
    g.poly(scaled(quad, 0.6 + t * 1.1)).stroke({ width: px, color, alpha: (1 - t) ** 2 });
  }
}

/**
 * Son propre piège, pendant que la pièce adverse marche vers lui : le joueur le voyait
 * déjà, il ne doit pas disparaître avant d'avoir servi.
 */
export function drawTrapAwaiting(
  g: Graphics,
  board: Board,
  coord: Coord,
  proj: IsoProjection,
  px: number,
): void {
  const quad = topOf(board, coord, proj);
  if (quad === undefined) return;
  trapSeal(g, quad, look().selection.trapMark, look().selection.trap, 0.9, px);
}

/**
 * Le déclenchement, une fois la pièce sur la case : la case s'embrase, deux mâchoires
 * dentées se referment d'est en ouest, une onde et des éclats partent, puis le sceau du
 * piège reste un instant, en rouge, là où il était.
 */
export function drawTrapSpring(
  g: Graphics,
  board: Board,
  coord: Coord,
  elapsed: number,
  proj: IsoProjection,
  px: number,
): void {
  const state = trapSpringAt(elapsed, MOTION_FX.trapSnapMs);
  const quad = topOf(board, coord, proj);
  if (state === undefined || quad === undefined) return;
  const threat = look().state.threat;
  const trap = look().selection.trap;
  const ink = look().palette.ink;
  const height = board.heightAt(coord) ?? 0;

  g.poly(scaled(quad, 1)).fill({ color: threat, alpha: 0.45 * state.flash });

  // Les mâchoires : une de chaque côté, leur front denté avance jusqu'au milieu de la case.
  const jawAlpha = state.scar > 0 ? Math.min(1, state.scar * 1.6) : 1;
  for (const jaw of trapJawsOf(quad, state.jaws)) {
    g.poly(jaw)
      .fill({ color: threat, alpha: 0.8 * jawAlpha })
      .stroke({ width: px, color: ink, alpha: 0.7 * jawAlpha });
  }

  if (state.burst > 0 && state.burst < 1) {
    g.poly(scaled(quad, 0.7 + state.burst * 1.1)).stroke({
      width: px,
      color: threat,
      alpha: (1 - state.burst) ** 2,
    });
    for (const shard of sparksOf(MOTION_FX.sparks + 4, coord.x * 17 + coord.y * 5)) {
      const t = state.burst;
      const at = project(
        { x: coord.x + shard.dx * t * 1.4, y: coord.y + shard.dy * t * 1.4 },
        height + shard.rise * Math.sin(Math.PI * Math.min(1, t * 1.2)),
        proj,
      );
      spark(g, at, px * (t < 0.4 ? 2 : 1), t < 0.5 ? threat : trap, 1 - t);
    }
  }

  if (state.scar > 0) trapSeal(g, quad, look().selection.trapMark, threat, state.scar, px);
}
