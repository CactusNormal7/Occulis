import type { Graphics } from "pixi.js";
import { type Board, type Coord, type CoordKey, chebyshevDistance, coordKey } from "@occulis/core";
import {
  type IsoProjection,
  type Quad,
  cliffQuads,
  flattenQuad,
  project,
  tileQuad,
} from "@occulis/board/iso";
import { type Landing, cascadeOf, landingAt, sparksOf } from "../../view/effects.js";
import { easeOutCubic, phase } from "../../view/easing.js";
import type { Selection } from "../../game/selection.js";
import { MOTION_FX, look } from "@occulis/board/theme";

/**
 * Les marques des cases — survol, pièce sélectionnée, destinations — et les retombées.
 *
 * Les marques se peignent **dans l'ordre du peintre du monde** (`drawTileMarks()`, appelée
 * par `scene.ts` juste après chaque case) : un relief plus proche les cache comme il cache
 * une pièce. Peintes par-dessus tout le plateau, une destination au pied d'un bloc
 * semblait posée sur son sommet. Seules les retombées (`drawLanding()`) restent dans la
 * couche du dessus : ce sont des éclats, pas des cases.
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

/** Ce qui peut marquer une case, et depuis quand (ms) — de quoi animer chaque marque. */
export interface TileMarks {
  readonly selection: Selection | undefined;
  /** Depuis la sélection : les destinations s'ouvrent en cascade, la case d'origine se pose. */
  readonly sinceSelected: number;
  /** La respiration des destinations, de 0 à 1. */
  readonly glow: number;
  readonly hovered: Coord | undefined;
  readonly sinceHovered: number;
  /** Les pièges posés du joueur : il est seul à les voir (`PlayerView.traps`). */
  readonly traps: ReadonlySet<CoordKey>;
}

/**
 * Les marques d'une case, peintes juste après elle : destination ou prise, puis la case
 * de la pièce sélectionnée, puis le survol, du plus discret au plus net.
 */
export function drawTileMarks(
  g: Graphics,
  board: Board,
  coord: Coord,
  marks: TileMarks,
  proj: IsoProjection,
  px: number,
): void {
  const key = coordKey(coord);
  const { selection } = marks;
  if (marks.traps.has(key)) drawTrap(g, board, coord, proj, px, marks.glow);
  if (selection !== undefined) {
    if (selection.aiming && selection.abilityTargets.has(key)) {
      drawAbilityTarget(g, board, coord, selection, proj, px, marks.glow, marks.sinceSelected);
    }
    if (!selection.aiming && selection.moves.has(key)) {
      drawDestination(g, board, coord, selection, proj, px, marks.glow, marks.sinceSelected);
    }
    if (coordKey(selection.piece.coord) === key) {
      drawSelectedTile(g, board, coord, proj, px, marks.glow, marks.sinceSelected);
    }
  }
  if (marks.hovered !== undefined && coordKey(marks.hovered) === key) {
    drawHover(g, board, coord, proj, px, marks.sinceHovered);
  }
}

/**
 * Les quatre coins de la case, en branches courtes : un réticule plutôt qu'un cadre. Il
 * se referme sur la case à son arrivée (`since`, ms depuis le début du survol).
 */
function drawHover(
  g: Graphics,
  board: Board,
  coord: Coord,
  proj: IsoProjection,
  px: number,
  since: number,
): void {
  const hover = look().hover;
  const tile = board.getTile(coord);
  const quad = topOf(board, coord, proj);
  if (tile === undefined || quad === undefined) return;
  const settle = easeOutCubic(phase(since, 0, MOTION_FX.hoverMs));

  for (const cliff of cliffQuads(board, tile.coord, tile.height, proj)) {
    g.poly(flattenQuad(cliff)).stroke({
      width: px,
      color: hover.stroke,
      alpha: hover.cliffAlpha * settle,
    });
  }
  g.poly(flattenQuad(quad)).fill({ color: hover.fill, alpha: hover.fillAlpha * settle });

  const spread = scaled(quad, 1 + 0.35 * (1 - settle));
  for (let i = 0; i < 4; i += 1) {
    const at = (j: number) => ({
      x: spread[((j + 4) % 4) * 2] ?? 0,
      y: spread[((j + 4) % 4) * 2 + 1] ?? 0,
    });
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
 * Une destination de la pièce sélectionnée. Elles s'ouvrent en cascade depuis la pièce
 * (`since`, ms depuis la sélection), puis respirent (`glow`, 0 → 1).
 */
function drawDestination(
  g: Graphics,
  board: Board,
  coord: Coord,
  selection: Selection,
  proj: IsoProjection,
  px: number,
  glow: number,
  since: number,
): void {
  const style = look().selection;
  const quad = topOf(board, coord, proj);
  if (quad === undefined) return;
  const open = cascadeOf(
    chebyshevDistance(coord, selection.piece.coord),
    since,
    MOTION_FX.cascadePerTileMs,
    MOTION_FX.cascadeMs,
  );
  if (open <= 0) return;
  if (selection.captures.has(coordKey(coord))) {
    // Une prise : la case entière se cerne d'un trait plein, sans gemme — la pièce
    // adverse qui s'y tient reste lisible, et la case ne se confond pas avec une case libre.
    g.poly(scaled(quad, Math.min(1, open)))
      .fill({ color: style.destination, alpha: lerp(style.destinationFillAlpha, glow) })
      .stroke({
        width: style.pieceWidth * px,
        color: style.destination,
        alpha: Math.min(1, open),
      });
    return;
  }
  g.poly(scaled(quad, Math.min(1, open)))
    .fill({
      color: style.destination,
      alpha: lerp(style.destinationFillAlpha, glow) * Math.min(1, open),
    })
    .stroke({
      width: style.destinationWidth * px,
      color: style.destination,
      alpha: style.destinationStrokeAlpha * Math.min(1, open),
    });
  // La gemme centrale : elle jaillit un peu trop grande, puis se pose.
  g.poly(scaled(quad, style.destinationGem * open)).fill({
    color: style.destination,
    alpha: 0.7 + 0.3 * glow,
  });
}

/**
 * Un piège posé du joueur : un losange au trait au centre de la case, barré d'une croix,
 * qui respire à peine. Discret — il est là pour être retrouvé, pas pour attirer l'œil.
 */
function drawTrap(
  g: Graphics,
  board: Board,
  coord: Coord,
  proj: IsoProjection,
  px: number,
  glow: number,
): void {
  const style = look().selection;
  const quad = topOf(board, coord, proj);
  if (quad === undefined) return;
  const mark = scaled(quad, style.trapMark);
  const alpha = 0.65 + 0.25 * glow;
  g.poly(mark).stroke({ width: px, color: style.trap, alpha });
  g.moveTo(mark[0] ?? 0, mark[1] ?? 0)
    .lineTo(mark[4] ?? 0, mark[5] ?? 0)
    .moveTo(mark[2] ?? 0, mark[3] ?? 0)
    .lineTo(mark[6] ?? 0, mark[7] ?? 0)
    .stroke({ width: px, color: style.trap, alpha: alpha * 0.6 });
}

/**
 * Une case où la capacité armée peut s'exercer. Elle s'ouvre comme une destination, mais
 * dans la couleur du piège, et sans gemme : rien ne s'y rendra.
 */
function drawAbilityTarget(
  g: Graphics,
  board: Board,
  coord: Coord,
  selection: Selection,
  proj: IsoProjection,
  px: number,
  glow: number,
  since: number,
): void {
  const style = look().selection;
  const quad = topOf(board, coord, proj);
  if (quad === undefined) return;
  const open = Math.min(
    1,
    cascadeOf(
      chebyshevDistance(coord, selection.piece.coord),
      since,
      MOTION_FX.cascadePerTileMs,
      MOTION_FX.cascadeMs,
    ),
  );
  if (open <= 0) return;
  g.poly(scaled(quad, open))
    .fill({ color: style.trap, alpha: lerp(style.destinationFillAlpha, glow) * open })
    .stroke({ width: style.destinationWidth * px, color: style.trap, alpha: open });
  g.poly(scaled(quad, style.trapMark * open)).stroke({
    width: px,
    color: style.trap,
    alpha: 0.5 + 0.4 * glow,
  });
}

/** La case de la pièce sélectionnée : son dessus et ses falaises, cernés. */
function drawSelectedTile(
  g: Graphics,
  board: Board,
  coord: Coord,
  proj: IsoProjection,
  px: number,
  glow: number,
  since: number,
): void {
  const style = look().selection;
  const tile = board.getTile(coord);
  const quad = topOf(board, coord, proj);
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
export function drawLanding(
  g: Graphics,
  board: Board,
  landing: Landing,
  proj: IsoProjection,
  px: number,
  now: number,
): void {
  const state = landingAt(landing, now, MOTION_FX.landingMs);
  const quad = topOf(board, landing.coord, proj);
  if (state === undefined || quad === undefined) return;
  g.poly(scaled(quad, state.ring)).stroke({
    width: px,
    color: landing.color,
    alpha: state.ringAlpha,
  });
  g.poly(scaled(quad, state.ring * 0.7)).stroke({
    width: px,
    color: look().palette.ink,
    alpha: state.ringAlpha * 0.5,
  });

  for (const spark of sparksOf(MOTION_FX.sparks, landing.start)) {
    const t = state.spark;
    const at = project(
      {
        x: landing.coord.x + spark.dx * easeOutCubic(t),
        y: landing.coord.y + spark.dy * easeOutCubic(t),
      },
      landing.height + spark.rise * Math.sin(Math.PI * Math.min(1, t * 1.3)),
      proj,
    );
    g.rect(at.x - px / 2, at.y - px / 2, px * (t < 0.4 ? 2 : 1), px * (t < 0.4 ? 2 : 1)).fill({
      color: landing.color,
      alpha: state.sparkAlpha,
    });
  }
}
