import type { FillPattern, Graphics } from "pixi.js";
import type { Board, Tile } from "@occulis/core";
import {
  type IsoProjection,
  type Quad,
  type ScreenPoint,
  cliffQuads,
  project,
  tileQuad,
} from "@occulis/board/iso";
import { topColor } from "@occulis/board/matter";
import { mixColor } from "@occulis/board/pixel";
import { look } from "@occulis/board/theme";

/**
 * Émet la géométrie d'une case dans un `Graphics` fourni, plutôt que d'en
 * posséder un : c'est ce qui permet à `scene.ts` d'entrelacer terrain et pièces
 * dans un seul ordre du peintre, et donc d'occulter correctement.
 *
 * Les faces sont pleines : la matière sombre du plateau masque ce qui est derrière un
 * relief, et l'os n'en dessine que les arêtes.
 */

/** Ce qu'il faut à une case pour se peindre, au-delà de sa propre géométrie. */
export interface TilePaint {
  /** 0 hors de vue, 1 en vue ; entre les deux, la case s'éclaire ou s'éteint. */
  readonly light: number;
  /** Le front de la vague de lumière, qui fait luire les arêtes à son passage. */
  readonly crest: number;
  /** 0 sur la case la plus lointaine, 1 sur la plus proche. */
  readonly nearness: number;
  /** Un pixel du plateau, en unités logiques. */
  readonly px: number;
  /** La trame un-sur-deux couleur du vide, posée sur ce qui est hors de vue. */
  readonly dither: FillPattern;
  /** Décalage vertical à l'écran (entrée du plateau), et opacité d'ensemble. */
  readonly drop: number;
  readonly alpha: number;
  /** 0 en vue isométrique, 1 en vue de dessus : le relief y paraît en rebords et en points. */
  readonly flatness: number;
}

function depthAlpha(nearness: number): number {
  const { depthFadeNear, depthFadeFar } = look().geometry;
  return depthFadeFar + (depthFadeNear - depthFadeFar) * nearness;
}

function shifted(quad: Quad, dy: number): number[] {
  return quad.flatMap((point) => [point.x, point.y + dy]);
}

/**
 * Une falaise n'est dessinée que si elle fait face à la caméra : son arête haute est dans
 * la moitié basse du dessus. Une face arrière, pleine, déborderait sous le relief.
 */
function facesCamera(cliff: Quad, centreY: number): boolean {
  return (cliff[0].y + cliff[1].y) / 2 > centreY;
}

export function drawTile(
  g: Graphics,
  board: Board,
  tile: Tile,
  paint: TilePaint,
  proj: IsoProjection,
): void {
  const geometry = look().geometry;
  const { light, crest, nearness, px, dither, drop, alpha: opacity } = paint;
  const edge =
    (geometry.alphaFogged + (geometry.alphaVisible - geometry.alphaFogged) * light + crest * 0.45) *
    (tile.passable ? 1 : geometry.impassableFactor) *
    depthAlpha(nearness) *
    opacity;
  const centre = project(tile.coord, tile.height, proj);
  const background = look().palette.background;

  for (const cliff of cliffQuads(board, tile.coord, tile.height, proj)) {
    if (!facesCamera(cliff, centre.y)) continue;
    const side = (cliff[0].x + cliff[1].x) / 2 < centre.x ? geometry.sideLight : geometry.sideShade;
    const points = shifted(cliff, drop);
    g.poly(points)
      .fill({ color: mixColor(mixColor(side, background, 0.45), side, light), alpha: opacity })
      .stroke({ width: geometry.widthCliff * px, color: geometry.stroke, alpha: edge * 0.55 });
  }

  const top = shifted(tileQuad(tile.coord, tile.height, proj), drop);
  g.poly(top).fill({ color: topColor(tile.height, light), alpha: opacity });
  if (light < 1)
    g.poly(top).fill({ fill: dither, alpha: geometry.fogDitherAlpha * (1 - light) * opacity });
  g.poly(top).stroke({
    width: geometry.widthTop * px,
    color: geometry.stroke,
    alpha: Math.min(1, edge),
  });
  if (paint.flatness > 0) drawFlatRelief(g, board, tile, paint, proj, Math.min(1, edge * 2));
}

/**
 * Le relief vu d'en haut, qui paraît avec la vue de dessus : les faces des falaises s'y
 * réduisent à leur arête haute, tracée en rebord épais, et la hauteur de la case se compte
 * en points dans son coin haut-gauche à l'écran, un par niveau.
 */
function drawFlatRelief(
  g: Graphics,
  board: Board,
  tile: Tile,
  paint: TilePaint,
  proj: IsoProjection,
  strength: number,
): void {
  const plan = look().geometry.plan;
  const stroke = look().geometry.stroke;
  const { px, flatness, alpha: opacity } = paint;

  // Une falaise aplatie n'est plus que son arête haute, entre ses deux premiers sommets.
  for (const cliff of cliffQuads(board, tile.coord, tile.height, proj)) {
    g.moveTo(cliff[0].x, cliff[0].y)
      .lineTo(cliff[1].x, cliff[1].y)
      .stroke({
        width: plan.ledgeWidth * px,
        color: stroke,
        alpha: plan.ledgeAlpha * strength * flatness * opacity,
      });
  }

  if (tile.height <= 0) return;
  const top = tileQuad(tile.coord, tile.height, proj);
  const { corner, right, down } = screenAxes(top);
  const side = Math.hypot(right.x, right.y);
  const size = Math.max(px, Math.round((side * plan.pipRatio) / px) * px);
  for (let level = 0; level < tile.height; level += 1) {
    const along = plan.pipInset + level * plan.pipStep;
    const x = corner.x + right.x * along + down.x * plan.pipInset;
    const y = corner.y + right.y * along + down.y * plan.pipInset;
    g.rect(x - size / 2, y - size / 2, size, size).fill({
      color: stroke,
      alpha: plan.pipAlpha * strength * flatness * opacity,
    });
  }
}

/**
 * Le coin haut-gauche d'une case à l'écran, et ses deux côtés qui en partent : vers la
 * droite et vers le bas. Lus à l'écran plutôt que sur la carte, ils restent les mêmes
 * quel que soit l'angle du plateau.
 */
function screenAxes(quad: Quad): { corner: ScreenPoint; right: ScreenPoint; down: ScreenPoint } {
  let index = 0;
  quad.forEach((point, i) => {
    const best = quad[index] ?? point;
    if (point.x + point.y < best.x + best.y) index = i;
  });
  const corner = quad[index] ?? quad[0];
  const next = quad[(index + 1) % 4] ?? corner;
  const previous = quad[(index + 3) % 4] ?? corner;
  const toNext = { x: next.x - corner.x, y: next.y - corner.y };
  const toPrevious = { x: previous.x - corner.x, y: previous.y - corner.y };
  const nextIsRight = toNext.x - toNext.y > toPrevious.x - toPrevious.y;
  return {
    corner,
    right: nextIsRight ? toNext : toPrevious,
    down: nextIsRight ? toPrevious : toNext,
  };
}
