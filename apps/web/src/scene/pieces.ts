import type { FillPattern, Graphics } from "pixi.js";
import type { IsoProjection, ScreenPoint } from "../view/iso.js";
import { mixColor } from "../view/pixel.js";
import { BACKGROUND, PIECES } from "../theme.js";

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
  /** La trame un-sur-deux dans la couleur du camp, pour un fantôme. */
  readonly dither: FillPattern;
}

export function drawPiece(
  g: Graphics,
  base: ScreenPoint,
  paint: PiecePaint,
  proj: IsoProjection,
): void {
  const { color, ghost, px, dither } = paint;
  const alpha = ghost ? PIECES.alphaGhost : PIECES.alphaVisible;
  const width = PIECES.strokeWidth * px;
  const tall = proj.heightUnit * proj.scale * PIECES.bodyRatio;
  const foot = proj.tileWidth * proj.scale * PIECES.bodyRatioWidth;
  const half = proj.tileWidth * proj.scale * PIECES.headRatio;
  const top = base.y - tall;
  const eye = top - PIECES.float * px - half * 0.75;

  if (!ghost) {
    g.ellipse(base.x, base.y, foot * 1.6, foot * 0.8).fill({
      color: PIECES.shadow,
      alpha: PIECES.shadowAlpha,
    });
  }

  // L'obélisque : une face éclairée à gauche, une face d'ombre à droite, sommet effilé.
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
    g.poly(left).fill({ color: mixColor(color, BACKGROUND, PIECES.faceLight) });
    g.poly(right).fill({ color: mixColor(color, BACKGROUND, PIECES.faceShade) });
  }
  g.poly(outline).stroke({ width, color, alpha });

  // L'œil : un losange de la couleur du camp, la pupille percée dans le vide.
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
      .fill({ color })
      .stroke({ width, color: mixColor(color, BACKGROUND, 0.3) });
    const pupil = Math.max(px, half * 0.28);
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
      color: BACKGROUND,
    });
  }
}
