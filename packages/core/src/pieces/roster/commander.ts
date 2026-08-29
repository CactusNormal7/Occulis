import { PieceType } from "../piece-type.js";
import type { PieceKind } from "../piece.js";
import type { MovementProfile, VisionProfile } from "../profiles.js";

/**
 * Pièce maîtresse : sa capture met fin à la partie (docs/design.md section 7).
 *
 * Plus lente et plus myope que l'éclaireur — la différenciation passe par la
 * capacité et le mouvement, jamais par la robustesse.
 *
 * PROVISOIRE, comme `Scout` : voir la note de portée dans `scout.ts`.
 */
export class Commander extends PieceType {
  readonly kind: PieceKind = "commander";
  readonly movement: MovementProfile = { steps: 3, adjacency: "octile", canClimb: true };
  readonly vision: VisionProfile = { range: 14 };

  override get isCommander(): boolean {
    return true;
  }
}
