import { PieceType } from "../piece-type.js";
import type { PieceKind } from "../piece.js";
import type { MovementProfile, VisionProfile } from "../profiles.js";

/**
 * Éclaireur : rapide et voyant loin, sans autre particularité.
 *
 * Les caractéristiques sont déclarées ici et nulle part ailleurs. Elles sont
 * annotées au type large (`PieceKind`, `MovementProfile`) et non au littéral, pour
 * qu'une sous-classe puisse se spécialiser sans que TypeScript ne fige la valeur
 * de la classe de base.
 *
 * PROVISOIRE : aucun roster n'est acté (docs/design/open-points.md, point 12). Trois
 * pas depuis `provisional-3` (décision du 2026-11-16) : les six d'avant couvraient
 * presque toute la carte et mettaient le roi adverse en échec permanent. La vue, elle,
 * reste généreuse — sur les cartes de démonstration, seule l'occultation la limite. Ce
 * n'est pas un équilibrage. Les anciens chiffres vivent dans `legacy.ts`.
 */
export class Scout extends PieceType {
  readonly kind: PieceKind = "scout";
  readonly movement: MovementProfile = { steps: 3, adjacency: "octile", canClimb: true };
  readonly vision: VisionProfile = { range: 20 };
}
