import { type PieceRole, PieceType } from "../piece-type.js";
import type { PieceKind } from "../piece.js";
import type { MovementProfile, VisionProfile } from "../profiles.js";

/**
 * Pion : la pièce de base, sans capacité, à la vue courte — la différenciation passe par
 * le mouvement et la vision, jamais par la robustesse (docs/design.md section 2).
 *
 * Deux pas dans toutes les directions : il atteint tout le carré de cinq cases de côté
 * qui l'entoure, et peut contourner un obstacle (décision du porteur du projet du
 * 2026-11-24, ruleset `provisional-5`). Le pion d'un pas des parties antérieures vit dans
 * `legacy.ts`.
 *
 * PROVISOIRE, comme le reste du roster : ce n'est pas un équilibrage.
 */
export class Pawn extends PieceType {
  readonly kind: PieceKind = "pawn";
  readonly movement: MovementProfile = { steps: 2, adjacency: "octile", canClimb: true };
  readonly vision: VisionProfile = { range: 6 };

  override get role(): PieceRole {
    return "pawn";
  }
}
