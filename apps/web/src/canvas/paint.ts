import type { Board, PlayerId } from "@occulis/core";
import { cssColor } from "@occulis/ui/tokens";
import { BACKGROUND, GEOMETRY, PIECES, PLAYERS } from "../theme.js";
import { type IsoProjection, type Quad, type ScreenPoint, cliffQuads, depthOf, project, tileQuad } from "../view/iso.js";
import { topColor } from "../view/matter.js";
import { mixColor, pixelResolution } from "../view/pixel.js";

/**
 * Les primitives du plateau en Canvas 2D, partagées par le rejeu du back-office et du
 * profil (`admin/replay-canvas.ts`) et par le plateau de déploiement
 * (`team/placement-canvas.ts`). Même géométrie que le jeu (`view/iso.ts`), mêmes tokens
 * (`theme.ts`), même grain (`view/pixel.ts`) : ce qui est dessiné ici ressemble à ce que
 * PixiJS dessine en partie.
 *
 * Les épaisseurs passées ici sont en **pixels du plateau**, comme dans `scene/`.
 */

/** Un élément à peindre, avec sa profondeur pour l'ordre du peintre (`compareDepth`). */
export interface Drawable {
  readonly depth: ReturnType<typeof depthOf>;
  readonly paint: () => void;
}

/**
 * Dimensionne le tampon d'un canevas au grain du plateau et l'agrandit au plus proche
 * voisin. Rend sa taille CSS, ou `undefined` s'il n'en a pas encore.
 */
export function fitPixelCanvas(canvas: HTMLCanvasElement): { width: number; height: number } | undefined {
  const { width, height } = canvas.getBoundingClientRect();
  if (width === 0 || height === 0) return undefined;
  const resolution = pixelResolution(window.devicePixelRatio);
  canvas.width = Math.max(1, Math.round(width * resolution));
  canvas.height = Math.max(1, Math.round(height * resolution));
  canvas.style.imageRendering = "pixelated";
  return { width, height };
}

/** Un pixel du tampon, en unités du tracé courant (la transformation est une simple échelle). */
function pixelOf(context: CanvasRenderingContext2D): number {
  return 1 / (context.getTransform().a || 1);
}

const patterns = new WeakMap<CanvasRenderingContext2D, CanvasPattern | null>();

/** La trame un-sur-deux du jeu (`scene/scene.ts`), dans la couleur du vide. */
function ditherOf(context: CanvasRenderingContext2D): CanvasPattern | null {
  if (!patterns.has(context)) {
    const tile = document.createElement("canvas");
    tile.width = 2;
    tile.height = 2;
    const tileContext = tile.getContext("2d");
    if (tileContext !== null) {
      tileContext.fillStyle = cssColor(GEOMETRY.fogDither);
      tileContext.fillRect(0, 0, 1, 1);
      tileContext.fillRect(1, 1, 1, 1);
    }
    patterns.set(context, context.createPattern(tile, "repeat"));
  }
  const pattern = patterns.get(context) ?? null;
  pattern?.setTransform(new DOMMatrix().scale(pixelOf(context)));
  return pattern;
}

export function trace(context: CanvasRenderingContext2D, quad: Quad): void {
  context.beginPath();
  quad.forEach((point, i) => (i === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y)));
  context.closePath();
}

function tracePoints(context: CanvasRenderingContext2D, points: readonly number[]): void {
  context.beginPath();
  for (let i = 0; i < points.length; i += 2) {
    const x = points[i] ?? 0;
    const y = points[i + 1] ?? 0;
    if (i === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
}

export function strokeQuad(context: CanvasRenderingContext2D, quad: Quad, color: string, width: number): void {
  trace(context, quad);
  context.strokeStyle = color;
  context.lineWidth = width * pixelOf(context);
  context.stroke();
}

export function fillQuad(context: CanvasRenderingContext2D, quad: Quad, color: string): void {
  trace(context, quad);
  context.fillStyle = color;
  context.fill();
}

/**
 * Le relief, case par case, avec les faces pleines et l'atténuation en profondeur du
 * jeu. `lit` dit l'éclairage d'une case (vue ou tramée) ; `decorate` peint ce qui s'y
 * ajoute (une zone, un survol) **dans le même ordre du peintre**, juste après la case.
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
        const seen = lit(`${tile.coord.x},${tile.coord.y}`);
        const alpha =
          (seen ? GEOMETRY.alphaVisible : GEOMETRY.alphaFogged) *
          (tile.passable ? 1 : GEOMETRY.impassableFactor) *
          (GEOMETRY.depthFadeFar + (GEOMETRY.depthFadeNear - GEOMETRY.depthFadeFar) * nearness);
        const centre = project(tile.coord, tile.height, proj);
        for (const cliff of cliffQuads(board, tile.coord, tile.height, proj)) {
          const side = (cliff[0].x + cliff[1].x) / 2 < centre.x ? GEOMETRY.sideLight : GEOMETRY.sideShade;
          fillQuad(context, cliff, cssColor(seen ? side : mixColor(side, BACKGROUND, 0.45)));
          strokeQuad(context, cliff, cssColor(GEOMETRY.stroke, alpha * 0.55), GEOMETRY.widthCliff);
        }
        const top = tileQuad(tile.coord, tile.height, proj);
        fillQuad(context, top, cssColor(topColor(tile.height, seen)));
        const dither = seen ? null : ditherOf(context);
        if (dither !== null) {
          context.globalAlpha = GEOMETRY.fogDitherAlpha;
          trace(context, top);
          context.fillStyle = dither;
          context.fill();
          context.globalAlpha = 1;
        }
        strokeQuad(context, top, cssColor(GEOMETRY.stroke, alpha), GEOMETRY.widthTop);
        decorate?.(tile.coord, tile.height);
      },
    });
  }
  return drawables;
}

/**
 * La silhouette de `scene/pieces.ts` — obélisque et œil flottant — tracée en Canvas 2D.
 * Une pièce moins qu'entièrement posée (`alpha` sous `PIECES.alphaVisible`) est un
 * fantôme : contour seul. Rend le haut de l'œil.
 */
export function drawPiece(
  context: CanvasRenderingContext2D,
  base: ScreenPoint,
  owner: PlayerId,
  alpha: number,
  proj: IsoProjection,
  color: number = PLAYERS[owner],
): ScreenPoint {
  const px = pixelOf(context);
  const ghost = alpha < PIECES.alphaVisible;
  const tall = proj.heightUnit * proj.scale * PIECES.bodyRatio;
  const foot = proj.tileWidth * proj.scale * PIECES.bodyRatioWidth;
  const half = proj.tileWidth * proj.scale * PIECES.headRatio;
  const top = base.y - tall;
  const eye = top - PIECES.float * px - half * 0.75;
  context.lineWidth = PIECES.strokeWidth * px;

  if (!ghost) {
    context.beginPath();
    context.ellipse(base.x, base.y, foot * 1.6, foot * 0.8, 0, 0, Math.PI * 2);
    context.fillStyle = cssColor(PIECES.shadow, PIECES.shadowAlpha);
    context.fill();
    tracePoints(context, [base.x - foot, base.y, base.x - foot * 0.45, top, base.x, top - px, base.x, base.y + foot * 0.35]);
    context.fillStyle = cssColor(mixColor(color, BACKGROUND, PIECES.faceLight));
    context.fill();
    tracePoints(context, [base.x, base.y + foot * 0.35, base.x, top - px, base.x + foot * 0.45, top, base.x + foot, base.y]);
    context.fillStyle = cssColor(mixColor(color, BACKGROUND, PIECES.faceShade));
    context.fill();
  }
  tracePoints(context, [
    base.x - foot,
    base.y,
    base.x - foot * 0.45,
    top,
    base.x,
    top - px,
    base.x + foot * 0.45,
    top,
    base.x + foot,
    base.y,
    base.x,
    base.y + foot * 0.35,
  ]);
  context.strokeStyle = cssColor(color, alpha);
  context.stroke();

  tracePoints(context, [base.x, eye - half * 0.75, base.x + half, eye, base.x, eye + half * 0.75, base.x - half, eye]);
  if (ghost) {
    context.stroke();
  } else {
    context.fillStyle = cssColor(color);
    context.fill();
    const pupil = Math.max(px, half * 0.28);
    tracePoints(context, [base.x, eye - pupil, base.x + pupil, eye, base.x, eye + pupil, base.x - pupil, eye]);
    context.fillStyle = cssColor(BACKGROUND);
    context.fill();
  }
  return { x: base.x, y: eye - half * 0.75 };
}
