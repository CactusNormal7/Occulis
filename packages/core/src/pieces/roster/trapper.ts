import { type AbilityKind, PieceType } from "../piece-type.js";
import type { PieceKind } from "../piece.js";
import type { MovementProfile, VisionProfile } from "../profiles.js";

/**
 * Trappeur : la première pièce à capacité (décision du porteur du projet, 2026-11-20).
 * À son tour, il se déplace **ou** pose un piège sur une case voisine
 * (docs/design/rules.md section 4) ; les règles du piège vivent dans `abilities/trap.ts`.
 *
 * Deux pas et une vue moyenne : il prépare le terrain plus qu'il ne court. PROVISOIRE,
 * comme le reste du roster (docs/design/open-points.md, point 12) : ces chiffres ne sont
 * pas un équilibrage.
 */
export class Trapper extends PieceType {
  readonly kind: PieceKind = "trapper";
  readonly movement: MovementProfile = { steps: 2, adjacency: "octile", canClimb: true };
  readonly vision: VisionProfile = { range: 8 };

  override get ability(): AbilityKind | null {
    return "trap";
  }
}
