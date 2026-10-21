import type { FillPattern, Graphics } from "pixi.js";
import type { IsoProjection, ScreenPoint } from "../../view/iso.js";
import { mixColor } from "../../view/pixel.js";
import { look } from "../../theme/theme.js";

/**
 * Silhouette d'une pièce : un obélisque à deux faces surmonté d'un œil flottant, en
 * pixels pleins. Un fantôme (pièce mémorisée hors de vue) n'en garde que le contour et
 * une trame : il est un souvenir, pas une présence.
 *
 * `PieceDefinition` ne porte aucun champ visuel — `packages/core` n'a aucune
 * dépendance de rendu — donc toute correspondance entre un `kind` et une forme
 * appartient à ce module. Le roster n'étant pas acté (design.md point ouvert 12),
 * toutes les pièces partagent pour l'instant la même silhouette.
 */

export interface PiecePaint {
  readonly color: number;
  readonly ghost: boolean;
  /** Un pixel du plateau, en unités logiques. */
  readonly px: number;
  /** La trame un-sur-deux dans la couleur du camp, pour un fantôme ou une image rémanente. */
  readonly dither: FillPattern;
  /** Opacité d'ensemble : matérialisation, image rémanente. */
  readonly alpha: number;
  /** De combien de pixels l'œil s'élève au-dessus de l'obélisque (sélection). */
  readonly rise: number;
  /** Un éclat de l'œil, 0 → 1 : retombée, matérialisation. */
  readonly flash: number;
  /** La colonne de lumière d'une pièce sélectionnée, 0 → 1, et sa couleur. */
  readonly beam: number;
  readonly beamColor: number;
}

/** Une colonne de lumière qui monte de la case et s'efface vers le haut, en bandes d'un pixel. */
function drawBeam(
  g: Graphics,
  base: ScreenPoint,
  width: number,
  height: number,
  color: number,
  strength: number,
  px: number,
): void {
  const bands = Math.max(4, Math.round(height / (px * 2)));
  for (let i = 0; i < bands; i += 1) {
    const t = i / bands;
    g.rect(
      base.x - width / 2,
      base.y - (i + 1) * (height / bands),
      width,
      height / bands + px * 0.5,
    ).fill({
      color,
      alpha: strength * 0.42 * (1 - t) ** 1.5,
    });
  }
}

export function drawPiece(
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
  const tall = proj.heightUnit * proj.scale * pieces.bodyRatio;
  const foot = proj.tileWidth * proj.scale * pieces.bodyRatioWidth;
  const half = proj.tileWidth * proj.scale * pieces.headRatio;
  const top = base.y - tall;
  const eye = top - pieces.float * px - half * 0.75 - rise;

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
