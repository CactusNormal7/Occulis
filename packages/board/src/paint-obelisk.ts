import { cssColor } from "@occulis/ui/tokens";
import { pixelOf, tracePoints } from "./canvas-trace.js";
import type { IsoProjection, ScreenPoint } from "./iso.js";
import { mixColor } from "./pixel.js";
import { look } from "./theme.js";

/**
 * L'obélisque surmonté d'un œil flottant, en Canvas 2D — la silhouette de
 * `render/pixi/piece-obelisk.ts`. Une pièce moins qu'entièrement posée (`alpha` sous
 * `look().pieces.alphaVisible`) est un fantôme : contour seul. Rend le haut de l'œil.
 */
export function paintObelisk(
  context: CanvasRenderingContext2D,
  base: ScreenPoint,
  alpha: number,
  proj: IsoProjection,
  color: number,
): ScreenPoint {
  const px = pixelOf(context);
  const ghost = alpha < look().pieces.alphaVisible;
  const tall = proj.heightUnit * proj.scale * look().pieces.obelisk.bodyRatio;
  const foot = proj.tileWidth * proj.scale * look().pieces.obelisk.bodyRatioWidth;
  const half = proj.tileWidth * proj.scale * look().pieces.obelisk.headRatio;
  const top = base.y - tall;
  const eye = top - look().pieces.obelisk.float * px - half * 0.75;
  context.lineWidth = look().pieces.strokeWidth * px;

  if (!ghost) {
    context.beginPath();
    context.ellipse(base.x, base.y, foot * 1.6, foot * 0.8, 0, 0, Math.PI * 2);
    context.fillStyle = cssColor(look().pieces.shadow, look().pieces.shadowAlpha);
    context.fill();
    tracePoints(context, [
      base.x - foot,
      base.y,
      base.x - foot * 0.45,
      top,
      base.x,
      top - px,
      base.x,
      base.y + foot * 0.35,
    ]);
    context.fillStyle = cssColor(
      mixColor(color, look().palette.background, look().pieces.faceLight),
    );
    context.fill();
    tracePoints(context, [
      base.x,
      base.y + foot * 0.35,
      base.x,
      top - px,
      base.x + foot * 0.45,
      top,
      base.x + foot,
      base.y,
    ]);
    context.fillStyle = cssColor(
      mixColor(color, look().palette.background, look().pieces.faceShade),
    );
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

  tracePoints(context, [
    base.x,
    eye - half * 0.75,
    base.x + half,
    eye,
    base.x,
    eye + half * 0.75,
    base.x - half,
    eye,
  ]);
  if (ghost) {
    context.stroke();
  } else {
    context.fillStyle = cssColor(color);
    context.fill();
    const pupil = Math.max(px, half * 0.28);
    tracePoints(context, [
      base.x,
      eye - pupil,
      base.x + pupil,
      eye,
      base.x,
      eye + pupil,
      base.x - pupil,
      eye,
    ]);
    context.fillStyle = cssColor(look().palette.background);
    context.fill();
  }
  return { x: base.x, y: eye - half * 0.75 };
}
