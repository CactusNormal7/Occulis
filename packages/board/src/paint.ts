import type { Board, PieceKind, PlayerId } from "@occulis/core";
import { cssColor } from "@occulis/ui/tokens";
import { look } from "./theme.js";
import {
  type IsoProjection,
  type Quad,
  type ScreenPoint,
  cliffQuads,
  depthOf,
  project,
  tileQuad,
} from "./iso.js";
import { pixelOf } from "./canvas-trace.js";

/** Un pixel du tampon, en unités du tracé courant : de quoi tracer des traits nets. */
export { pixelOf } from "./canvas-trace.js";
import { glyphOf } from "./glyphs.js";
import { topColor } from "./matter.js";
import { paintGlyph } from "./paint-glyph.js";
import { paintObelisk } from "./paint-obelisk.js";
import { mixColor, pixelResolution } from "./pixel.js";

/**
 * Les primitives du plateau en Canvas 2D, partagées par le rejeu du back-office et du
 * profil (`replay/replay-canvas.ts`) et par le plateau de déploiement
 * (`team-builder/placement-canvas.ts`). Même géométrie que le jeu (`@occulis/board/iso`), mêmes tokens
 * (`theme.ts`), même grain (`@occulis/board/pixel`) : ce qui est dessiné ici ressemble à ce que
 * PixiJS dessine en partie.
 *
 * Les épaisseurs passées ici sont en **pixels du plateau**, comme dans `render/pixi/`.
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
export function fitPixelCanvas(
  canvas: HTMLCanvasElement,
): { width: number; height: number } | undefined {
  const { width, height } = canvas.getBoundingClientRect();
  if (width === 0 || height === 0) return undefined;
  const resolution = pixelResolution(window.devicePixelRatio);
  canvas.width = Math.max(1, Math.round(width * resolution));
  canvas.height = Math.max(1, Math.round(height * resolution));
  canvas.style.imageRendering = "pixelated";
  return { width, height };
}

const patterns = new WeakMap<CanvasRenderingContext2D, Map<number, CanvasPattern | null>>();

/** La trame un-sur-deux du jeu (`render/pixi/scene.ts`), dans la couleur du vide. */
function ditherOf(context: CanvasRenderingContext2D): CanvasPattern | null {
  const color = look().geometry.fogDither;
  let byColor = patterns.get(context);
  if (byColor === undefined) {
    byColor = new Map();
    patterns.set(context, byColor);
  }
  if (!byColor.has(color)) {
    const tile = document.createElement("canvas");
    tile.width = 2;
    tile.height = 2;
    const tileContext = tile.getContext("2d");
    if (tileContext !== null) {
      tileContext.fillStyle = cssColor(color);
      tileContext.fillRect(0, 0, 1, 1);
      tileContext.fillRect(1, 1, 1, 1);
    }
    byColor.set(color, context.createPattern(tile, "repeat"));
  }
  const pattern = byColor.get(color) ?? null;
  pattern?.setTransform(new DOMMatrix().scale(pixelOf(context)));
  return pattern;
}

export function trace(context: CanvasRenderingContext2D, quad: Quad): void {
  context.beginPath();
  quad.forEach((point, i) =>
    i === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y),
  );
  context.closePath();
}

export function strokeQuad(
  context: CanvasRenderingContext2D,
  quad: Quad,
  color: string,
  width: number,
): void {
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
          (seen ? look().geometry.alphaVisible : look().geometry.alphaFogged) *
          (tile.passable ? 1 : look().geometry.impassableFactor) *
          (look().geometry.depthFadeFar +
            (look().geometry.depthFadeNear - look().geometry.depthFadeFar) * nearness);
        const centre = project(tile.coord, tile.height, proj);
        for (const cliff of cliffQuads(board, tile.coord, tile.height, proj)) {
          // Une face arrière, pleine, déborderait sous le relief (voir `render/pixi/terrain.ts`).
          if ((cliff[0].y + cliff[1].y) / 2 <= centre.y) continue;
          const side =
            (cliff[0].x + cliff[1].x) / 2 < centre.x
              ? look().geometry.sideLight
              : look().geometry.sideShade;
          fillQuad(
            context,
            cliff,
            cssColor(seen ? side : mixColor(side, look().palette.background, 0.45)),
          );
          strokeQuad(
            context,
            cliff,
            cssColor(look().geometry.stroke, alpha * 0.55),
            look().geometry.widthCliff,
          );
        }
        const top = tileQuad(tile.coord, tile.height, proj);
        fillQuad(context, top, cssColor(topColor(tile.height, seen ? 1 : 0)));
        const dither = seen ? null : ditherOf(context);
        if (dither !== null) {
          context.globalAlpha = look().geometry.fogDitherAlpha;
          trace(context, top);
          context.fillStyle = dither;
          context.fill();
          context.globalAlpha = 1;
        }
        strokeQuad(context, top, cssColor(look().geometry.stroke, alpha), look().geometry.widthTop);
        decorate?.(tile.coord, tile.height);
      },
    });
  }
  return drawables;
}

/** Ce qu'il faut savoir d'une pièce pour la dessiner : son type et son camp. */
export interface PieceToPaint {
  readonly kind: PieceKind;
  readonly owner: PlayerId;
}

/**
 * Une pièce, dans la silhouette choisie par `look().pieces.style` : le glyphe de son type
 * ou l'obélisque. Une pièce moins qu'entièrement posée (`alpha` sous
 * `look().pieces.alphaVisible`) est un fantôme. `color` remplace la couleur du camp (une
 * pièce sélectionnée). Rend le point le plus haut de la pièce, pour y poser une étiquette.
 */
export function drawPiece(
  context: CanvasRenderingContext2D,
  base: ScreenPoint,
  piece: PieceToPaint,
  alpha: number,
  proj: IsoProjection,
  color: number = look().players[piece.owner],
): ScreenPoint {
  if (look().pieces.style === "obelisk") return paintObelisk(context, base, alpha, proj, color);
  return paintGlyph(context, base, glyphOf(piece.kind), alpha, proj, color);
}
