import type { PieceKind } from "../piece.js";
import { type PieceRole, PieceType } from "../piece-type.js";
import {
  type MovementProfile,
  type VisionProfile,
  diagonalLines,
  orthogonalLines,
} from "../profiles.js";

/**
 * Le roi : la pièce à protéger (docs/design/rules.md section 7). C'est sur lui que
 * portent l'échec et le mat.
 *
 * Il se déplace comme le roi des échecs, avec une case de plus **en ligne droite** :
 * une case en diagonale, une ou deux en ligne (décision du porteur du projet du
 * 2026-11-24, ruleset `provisional-5`). La seconde case suppose la première libre : il
 * glisse, il ne saute pas. Le motif dessine un rond de pixels autour de lui. Il garde une
 * vue longue — la différenciation passe par la capacité et le mouvement, jamais par la
 * robustesse.
 *
 * PROVISOIRE, comme le reste du roster (docs/design/open-points.md, point 12). Le roi
 * d'un pas des parties `provisional-3` et `provisional-4` vit dans `legacy.ts`.
 */
export class Commander extends PieceType {
  readonly kind: PieceKind = "commander";
  readonly movement: MovementProfile = {
    steps: 2,
    adjacency: "octile",
    canClimb: true,
    lines: [...orthogonalLines(2), ...diagonalLines(1)],
  };
  readonly vision: VisionProfile = { range: 14 };

  override get role(): PieceRole {
    return "commander";
  }
}
