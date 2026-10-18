import type { Graphics } from "pixi.js";
import { type Board, type Coord, chebyshevDistance } from "@occulis/core";
import { type IsoProjection, type Quad, cliffQuads, flattenQuad, project, tileQuad } from "../view/iso.js";
import { type Landing, cascadeOf, landingAt, sparksOf } from "../view/effects.js";
import { easeOutCubic, phase } from "../view/easing.js";
import type { Selection } from "../game/selection.js";
import { MOTION_FX, look } from "../theme.js";

/**
 * Couche de surbrillance : survol, sélection et retombées. Dessinée par-dessus le monde
 * et dans son propre `Graphics`, redessinée à chaque image : tout y est animé.
 */

function lerp(range: readonly [number, number], t: number): number {
  return range[0] + (range[1] - range[0]) * t;
}

function topOf(board: Board, coord: Coord, proj: IsoProjection): Quad | undefined {
  const tile = board.getTile(coord);
  return tile === undefined ? undefined : tileQuad(tile.coord, tile.height, proj);
}

/** Le quadrilatère `quad` mis à l'échelle `k` autour de son centre. */
function scaled(quad: Quad, k: number): number[] {
  const cx = (quad[0].x + quad[2].x) / 2;
  const cy = (quad[0].y + quad[2].y) / 2;
  return quad.flatMap((p) => [cx + (p.x - cx) * k, cy + (p.y - cy) * k]);
}

/**
 * Les quatre coins de la case, en branches courtes : un réticule plutôt qu'un cadre. Il
 * se referme sur la case à son arrivée (`since`, ms depuis le début du survol).
 */
export function drawHover(g: Graphics, board: Board, coord: Coord, proj: IsoProjection, px: number, since: number): void {
  const hover = look().hover;
  const tile = board.getTile(coord);
  const quad = topOf(board, coord, proj);
  if (tile === undefined || quad === undefined) return;
  const settle = easeOutCubic(phase(since, 0, MOTION_FX.hoverMs));

  for (const cliff of cliffQuads(board, tile.coord, tile.height, proj)) {
    g.poly(flattenQuad(cliff)).stroke({ width: px, color: hover.stroke, alpha: hover.cliffAlpha * settle });
  }
  g.poly(flattenQuad(quad)).fill({ color: hover.fill, alpha: hover.fillAlpha * settle });

  const spread = scaled(quad, 1 + 0.35 * (1 - settle));
  for (let i = 0; i < 4; i += 1) {
    const at = (j: number) => ({ x: spread[((j + 4) % 4) * 2] ?? 0, y: spread[((j + 4) % 4) * 2 + 1] ?? 0 });
    const corner = at(i);
    const next = at(i + 1);
    const previous = at(i - 1);
    const k = hover.reticle;
    g.moveTo(corner.x + (previous.x - corner.x) * k, corner.y + (previous.y - corner.y) * k)
      .lineTo(corner.x, corner.y)
      .lineTo(corner.x + (next.x - corner.x) * k, corner.y + (next.y - corner.y) * k)
      .stroke({ width: hover.strokeWidth * px, color: hover.stroke, alpha: settle });
  }
}

/**
 * La pièce sélectionnée, puis ce qu'elle peut faire. Les destinations s'ouvrent en
 * cascade depuis la pièce (`since`, ms depuis la sélection), puis respirent (`glow`, 0 → 1).
 * Elles sont dessinées avant la case d'origine pour que celle-ci reste lisible.
 */
export function drawSelection(
  g: Graphics,
  board: Board,
  selection: Selection,
  proj: IsoProjection,
  px: number,
  glow: number,
  since: number,
): void {
  const style = look().selection;
  for (const coord of selection.moves.values()) {
    const quad = topOf(board, coord, proj);
    if (quad === undefined) continue;
    const open = cascadeOf(chebyshevDistance(coord, selection.piece.coord), since, MOTION_FX.cascadePerTileMs, MOTION_FX.cascadeMs);
    if (open <= 0) continue;
    g.poly(scaled(quad, Math.min(1, open)))
      .fill({ color: style.destination, alpha: lerp(style.destinationFillAlpha, glow) * Math.min(1, open) })
      .stroke({ width: style.destinationWidth * px, color: style.destination, alpha: style.destinationStrokeAlpha * Math.min(1, open) });
    // La gemme centrale : elle jaillit un peu trop grande, puis se pose.
    g.poly(scaled(quad, style.destinationGem * open)).fill({ color: style.destination, alpha: 0.7 + 0.3 * glow });
  }

  const tile = board.getTile(selection.piece.coord);
  const quad = topOf(board, selection.piece.coord, proj);
  if (tile === undefined || quad === undefined) return;
  const settle = easeOutCubic(phase(since, 0, MOTION_FX.liftMs));
  for (const cliff of cliffQuads(board, tile.coord, tile.height, proj)) {
    g.poly(flattenQuad(cliff)).stroke({ width: px, color: style.piece, alpha: 0.5 * settle });
  }
  g.poly(flattenQuad(quad))
    .fill({ color: style.piece, alpha: lerp(style.pieceFillAlpha, glow) * settle })
    .stroke({ width: style.pieceWidth * px, color: style.piece, alpha: settle });
}

/** Une retombée : deux ondes au sol qui s'élargissent, et des étincelles qui montent et s'éteignent. */
export function drawLanding(g: Graphics, board: Board, landing: Landing, proj: IsoProjection, px: number, now: number): void {
  const state = landingAt(landing, now, MOTION_FX.landingMs);
  const quad = topOf(board, landing.coord, proj);
  if (state === undefined || quad === undefined) return;
  g.poly(scaled(quad, state.ring)).stroke({ width: px, color: landing.color, alpha: state.ringAlpha });
  g.poly(scaled(quad, state.ring * 0.7)).stroke({ width: px, color: look().palette.ink, alpha: state.ringAlpha * 0.5 });

  for (const spark of sparksOf(MOTION_FX.sparks, landing.start)) {
    const t = state.spark;
    const at = project(
      { x: landing.coord.x + spark.dx * easeOutCubic(t), y: landing.coord.y + spark.dy * easeOutCubic(t) },
      landing.height + spark.rise * Math.sin(Math.PI * Math.min(1, t * 1.3)),
      proj,
    );
    g.rect(at.x - px / 2, at.y - px / 2, px * (t < 0.4 ? 2 : 1), px * (t < 0.4 ? 2 : 1)).fill({
      color: landing.color,
      alpha: state.sparkAlpha,
    });
  }
}
