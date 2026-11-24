import type { PieceKind } from "../piece.js";
import { type PieceRole, PieceType } from "../piece-type.js";
import type { MovementProfile, VisionProfile } from "../profiles.js";

/**
 * Le roi : la pièce à protéger (docs/design/rules.md section 7). C'est sur lui que
 * portent l'échec et le mat ; il n'a aucune autre spécificité pour l'instant.
 *
 * Un seul pas, comme aux échecs : avec les trois pas d'avant `provisional-3`, il
 * fuyait toute menace et aucun mat n'était constructible. Il garde une vue longue —
 * la différenciation passe par la capacité et le mouvement, jamais par la robustesse.
 *
 * PROVISOIRE, comme `Scout` : voir la note de portée dans `scout.ts`.
 */
export class Commander extends PieceType {
  readonly kind: PieceKind = "commander";
  readonly movement: MovementProfile = { steps: 1, adjacency: "octile", canClimb: true };
  readonly vision: VisionProfile = { range: 14 };

  override get role(): PieceRole {
    return "commander";
  }
}
