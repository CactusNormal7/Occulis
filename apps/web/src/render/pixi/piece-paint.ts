import type { FillPattern, Graphics } from "pixi.js";
import type { PieceKind } from "@occulis/core";
import type { ScreenPoint } from "@occulis/board/iso";

/**
 * Ce que la scène dit d'une pièce à dessiner, quelle que soit sa silhouette, et la
 * colonne de lumière d'une pièce sélectionnée, commune aux deux silhouettes.
 */
export interface PiecePaint {
  /** Le type de la pièce, qui choisit son glyphe. */
  readonly kind: PieceKind;
  readonly color: number;
  readonly ghost: boolean;
  /** Un pixel du plateau, en unités logiques. */
  readonly px: number;
  /** La trame un-sur-deux dans la couleur du camp, pour un fantôme ou une image rémanente. */
  readonly dither: FillPattern;
  /** Opacité d'ensemble : matérialisation, image rémanente. */
  readonly alpha: number;
  /** De combien la pièce s'élève quand elle est sélectionnée (l'œil de l'obélisque, le glyphe entier). */
  readonly rise: number;
  /**
   * 0 : debout sur le centre de sa case, vue de biais. 1 : centrée sur sa case, en vue de
   * dessus (`flatnessOf()`, `view/camera.ts`).
   */
  readonly seat: number;
  /** Un éclat de la pièce, 0 → 1 : retombée, matérialisation. */
  readonly flash: number;
  /** La colonne de lumière d'une pièce sélectionnée, 0 → 1, et sa couleur. */
  readonly beam: number;
  readonly beamColor: number;
}

/** Une colonne de lumière qui monte de la case et s'efface vers le haut, en bandes d'un pixel. */
export function drawBeam(
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
