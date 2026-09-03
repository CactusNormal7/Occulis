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
 * PROVISOIRE : aucun roster n'est acté (docs/design.md point ouvert 12). Les
 * portées sont volontairement généreuses — sur les cartes de démonstration, qui
 * font au plus une dizaine de cases de côté, seule l'occultation limite la vue.
 * C'est ce qui permet d'exercer la ligne de vue et le déplacement sans que des
 * portées serrées ne masquent le comportement. Ce n'est pas un équilibrage.
 */
export class Scout extends PieceType {
  readonly kind: PieceKind = "scout";
  readonly movement: MovementProfile = { steps: 6, adjacency: "octile", canClimb: true };
  readonly vision: VisionProfile = { range: 20 };
}
