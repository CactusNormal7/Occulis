import { type PieceRole, PieceType } from "../piece-type.js";
import type { PieceKind } from "../piece.js";
import type { MovementProfile, VisionProfile } from "../profiles.js";

/**
 * Pion : la pièce de base, sans capacité. Un pas, une vue courte — la différenciation
 * passe par le mouvement et la vision, jamais par la robustesse (docs/design.md
 * section 2).
 *
 * PROVISOIRE, comme `Scout` et `Commander` : le profil (un pas en octile, grimpe,
 * vision 6) est celui choisi par le porteur du projet pour rendre les pions jouables,
 * pas un équilibrage (docs/implementation-notes.md).
 */
export class Pawn extends PieceType {
  readonly kind: PieceKind = "pawn";
  readonly movement: MovementProfile = { steps: 1, adjacency: "octile", canClimb: true };
  readonly vision: VisionProfile = { range: 6 };

  override get role(): PieceRole {
    return "pawn";
  }
}
