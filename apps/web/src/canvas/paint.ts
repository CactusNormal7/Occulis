import type { Board, PlayerId } from "@occulis/core";
import { cssColor } from "@occulis/ui/tokens";
import { GEOMETRY, PIECES, PLAYERS } from "../theme.js";
import { type IsoProjection, type Quad, type ScreenPoint, cliffQuads, depthOf, tileQuad } from "../view/iso.js";

/**
 * Les primitives du plateau en Canvas 2D, partagées par le rejeu du back-office et du
 * profil (`admin/replay-canvas.ts`) et par le plateau de déploiement
 * (`team/placement-canvas.ts`). Même géométrie que le jeu (`view/iso.ts`), mêmes tokens
 * (`theme.ts`) : ce qui est dessiné ici ressemble à ce que PixiJS dessine en partie.
 */

/** Un élément à peindre, avec sa profondeur pour l'ordre du peintre (`compareDepth`). */
export interface Drawable {
  readonly depth: ReturnType<typeof depthOf>;
  readonly paint: () => void;
}

export function trace(context: CanvasRenderingContext2D, quad: Quad): void {
  context.beginPath();
  quad.forEach((point, i) => (i === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y)));
  context.closePath();
}

export function strokeQuad(context: CanvasRenderingContext2D, quad: Quad, color: string, width: number): void {
  trace(context, quad);
  context.strokeStyle = color;
  context.lineWidth = width;
  context.stroke();
}

export function fillQuad(context: CanvasRenderingContext2D, quad: Quad, color: string): void {
  trace(context, quad);
  context.fillStyle = color;
  context.fill();
}

/**
 * Le relief, case par case, avec l'atténuation en profondeur du jeu. `alphaOf` dit
 * l'éclairage d'une case (vue ou estompée) ; `decorate` peint ce qui s'y ajoute (une
 * zone, un survol) **dans le même ordre du peintre**, juste après la case.
 */
export function terrainDrawables(
  context: CanvasRenderingContext2D,
  board: Board,
  proj: IsoProjection,
  lit: (key: string) => boolean,
  decorate?: (coord: { x: number; y: number }, height: number) => void,
): Drawable[] {
  const drawables: Drawable[] = [];
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
        const alpha =
          (lit(`${tile.coord.x},${tile.coord.y}`) ? GEOMETRY.alphaVisible : GEOMETRY.alphaFogged) *
          (tile.passable ? 1 : GEOMETRY.impassableFactor) *
          (GEOMETRY.depthFadeFar + (GEOMETRY.depthFadeNear - GEOMETRY.depthFadeFar) * nearness);
        for (const cliff of cliffQuads(board, tile.coord, tile.height, proj)) {
          strokeQuad(context, cliff, cssColor(GEOMETRY.stroke, alpha), GEOMETRY.widthCliff);
        }
        strokeQuad(context, tileQuad(tile.coord, tile.height, proj), cssColor(GEOMETRY.stroke, alpha), GEOMETRY.widthTop);
        decorate?.(tile.coord, tile.height);
      },
    });
  }
  return drawables;
}

/** La silhouette de `scene/pieces.ts` — tige et tête en losange — tracée en Canvas 2D. Rend le haut de la tête. */
export function drawPiece(
  context: CanvasRenderingContext2D,
  base: ScreenPoint,
  owner: PlayerId,
  alpha: number,
  proj: IsoProjection,
  color: string = cssColor(PLAYERS[owner], alpha),
): ScreenPoint {
  const stem = proj.heightUnit * proj.scale * PIECES.stemRatio;
  const half = proj.tileWidth * proj.scale * PIECES.headRatio;
  const head = base.y - stem;
  context.strokeStyle = color;
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
  return { x: base.x, y: head - half * 0.9 };
}
