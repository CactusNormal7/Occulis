import { PieceType } from "../piece-type.js";
import type { PieceKind } from "../piece.js";
import { type MovementProfile, type VisionProfile, diagonalLines } from "../profiles.js";

/**
 * Fou : une pièce basique, sans capacité, qui glisse en diagonale comme aux échecs, sans
 * limite de portée — jusqu'au bord, à une pièce (qu'il prend si elle est adverse) ou à
 * une case qui monte (décision du porteur du projet du 2026-11-24, ruleset
 * `provisional-5`). Il remplace l'éclaireur avec la tour.
 *
 * Vue moyenne : ses diagonales portent plus loin que ses yeux, à lui de s'en servir
 * avec ce que voient les autres. PROVISOIRE, comme le reste du roster
 * (docs/design/open-points.md, point 12).
 */
export class Bishop extends PieceType {
  readonly kind: PieceKind = "bishop";
  readonly movement: MovementProfile = {
    steps: Infinity,
    adjacency: "octile",
    canClimb: true,
    lines: diagonalLines(Infinity),
  };
  readonly vision: VisionProfile = { range: 10 };
}
