import type { Graphics } from "pixi.js";
import type { IsoProjection, ScreenPoint } from "../iso.js";
import { PIECES } from "../theme.js";

/**
 * Silhouette d'une pièce : une tige et une tête en losange, en traits seuls.
 *
 * `PieceDefinition` ne porte aucun champ visuel — `packages/core` n'a aucune
 * dépendance de rendu — donc toute correspondance entre un `kind` et une forme
 * appartient à ce module. Le roster n'étant pas acté (design.md point ouvert 12),
 * toutes les pièces partagent pour l'instant la même silhouette.
 */
export function drawPiece(
  g: Graphics,
  base: ScreenPoint,
  color: number,
  alpha: number,
  proj: IsoProjection,
): void {
  const stem = proj.heightUnit * proj.scale * PIECES.stemRatio;
  const half = proj.tileWidth * proj.scale * PIECES.headRatio;
  const head = base.y - stem;

  g.moveTo(base.x, base.y).lineTo(base.x, head).stroke({ width: PIECES.strokeWidth, color, alpha });

  g.poly([
    base.x,
    head - half * 0.9,
    base.x + half,
    head,
    base.x,
    head + half * 0.9,
    base.x - half,
    head,
  ]).stroke({ width: PIECES.strokeWidth, color, alpha });
}
