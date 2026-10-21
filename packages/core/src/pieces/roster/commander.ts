import { type PieceRole, PieceType } from "../piece-type.js";
import type { PieceKind } from "../piece.js";
import type { MovementProfile, VisionProfile } from "../profiles.js";

/**
 * Pièce maîtresse : celle qu'il faut protéger (docs/design.md section 7). La prise et la
 * fin de partie sont retirées du moteur pour l'instant (point ouvert 13) : rien ne
 * l'atteint encore.
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

  override get role(): PieceRole {
    return "commander";
  }
}
