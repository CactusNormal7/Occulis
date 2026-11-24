import { PieceType } from "../piece-type.js";
import type { PieceKind } from "../piece.js";
import { type MovementProfile, type VisionProfile, orthogonalLines } from "../profiles.js";

/**
 * Tour : une pièce basique, sans capacité, qui glisse en ligne droite comme aux échecs,
 * sans limite de portée — jusqu'au bord, à une pièce (qu'elle prend si elle est adverse)
 * ou à une case qui monte (décision du porteur du projet du 2026-11-24, ruleset
 * `provisional-5`). Elle remplace l'éclaireur avec le fou.
 *
 * PROVISOIRE, comme le reste du roster (docs/design/open-points.md, point 12).
 */
export class Rook extends PieceType {
  readonly kind: PieceKind = "rook";
  readonly movement: MovementProfile = {
    steps: Infinity,
    adjacency: "octile",
    canClimb: true,
    lines: orthogonalLines(Infinity),
  };
  readonly vision: VisionProfile = { range: 10 };
}
