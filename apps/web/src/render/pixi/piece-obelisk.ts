import type { Graphics } from "pixi.js";
import type { IsoProjection, ScreenPoint } from "@occulis/board/iso";
import { mixColor } from "@occulis/board/pixel";
import { look } from "@occulis/board/theme";
import { drawBeam, type PiecePaint } from "./piece-paint.js";

/**
 * L'obélisque à deux faces surmonté d'un œil flottant, en pixels pleins : la silhouette
 * commune à tous les types avant l'ATH « Bandeaux », gardée en réserve
 * (`look().pieces.style`). Un fantôme n'en garde que le contour et une trame : il est un
 * souvenir, pas une présence.
 */
export function drawObelisk(
  g: Graphics,
  base: ScreenPoint,
  paint: PiecePaint,
  proj: IsoProjection,
): void {
  const pieces = look().pieces;
  const background = look().palette.background;
  const { color, ghost, px, dither, alpha: opacity, rise, flash, beam, beamColor } = paint;
  const alpha = (ghost ? pieces.alphaGhost : pieces.alphaVisible) * opacity;
  const width = pieces.strokeWidth * px;
  const tall = proj.heightUnit * proj.scale * pieces.obelisk.bodyRatio;
  const foot = proj.tileWidth * proj.scale * pieces.obelisk.bodyRatioWidth;
  const half = proj.tileWidth * proj.scale * pieces.obelisk.headRatio;
  const top = base.y - tall;
  const eye = top - pieces.obelisk.float * px - half * 0.75 - rise;

  if (beam > 0) drawBeam(g, base, foot * 2.4, tall * 4, beamColor, beam, px);

  if (!ghost) {
    g.ellipse(base.x, base.y, foot * 1.6, foot * 0.8).fill({
      color: pieces.shadow,
      alpha: pieces.shadowAlpha * opacity,
    });
  }

  const left = [
    base.x - foot,
    base.y,
    base.x - foot * 0.45,
    top,
    base.x,
    top - px,
    base.x,
    base.y + foot * 0.35,
  ];
  const right = [
    base.x,
    base.y + foot * 0.35,
    base.x,
    top - px,
    base.x + foot * 0.45,
    top,
    base.x + foot,
    base.y,
  ];
  const outline = [
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
  ];
  if (ghost) {
    g.poly(outline).fill({ fill: dither, alpha: alpha * 0.6 });
  } else {
    g.poly(left).fill({ color: mixColor(color, background, pieces.faceLight), alpha: opacity });
    g.poly(right).fill({ color: mixColor(color, background, pieces.faceShade), alpha: opacity });
  }
  g.poly(outline).stroke({ width, color, alpha });

  // Le halo de l'œil : la seule lumière qu'une pièce émet, plus vive quand elle s'éveille.
  if (!ghost) {
    g.circle(base.x, eye, half * (1.5 + flash)).fill({
      color,
      alpha: (0.07 + flash * 0.35) * opacity,
    });
  }

  const eyeShape = [
    base.x,
    eye - half * 0.75,
    base.x + half,
    eye,
    base.x,
    eye + half * 0.75,
    base.x - half,
    eye,
  ];
  if (ghost) {
    g.poly(eyeShape).stroke({ width, color, alpha });
  } else {
    g.poly(eyeShape)
      .fill({ color: mixColor(color, look().palette.ink, flash * 0.7), alpha: opacity })
      .stroke({ width, color: mixColor(color, background, 0.3), alpha: opacity });
    const pupil = Math.max(px, half * 0.28 * (1 - flash * 0.6));
    g.poly([
      base.x,
      eye - pupil,
      base.x + pupil,
      eye,
      base.x,
      eye + pupil,
      base.x - pupil,
      eye,
    ]).fill({
      color: background,
      alpha: opacity,
    });
  }
}
