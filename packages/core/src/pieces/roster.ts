import type { PieceKind } from "./piece.js";
import { PieceType } from "./piece-type.js";
import type { MovementProfile, VisionProfile } from "./profiles.js";
import { Ruleset } from "./ruleset.js";

/**
 * Roster provisoire.
 *
 * ATTENTION : aucun roster n'est acté (docs/design.md point ouvert 12). Ces deux
 * classes reprennent trait pour trait les définitions qui servaient déjà à la démo
 * de rendu et au squelette serveur — elles ne font que leur donner un seul lieu de
 * définition au lieu de trois copies. Ce n'est PAS du contenu de jeu et il ne faut
 * pas bâtir d'équilibrage dessus.
 */

const ground = (steps: number): MovementProfile => ({
  steps,
  adjacency: "octile",
  canClimb: true,
});

const sight = (range: number): VisionProfile => ({ range });

/** Éclaireur : rapide et voyant loin, sans autre particularité. */
export class Scout extends PieceType {
  // Annotés au type large et non au littéral : une sous-classe doit pouvoir se
  // spécialiser sans que TypeScript ne fige l'identifiant de la classe de base.
  readonly kind: PieceKind = "scout";
  readonly movement: MovementProfile = ground(3);
  readonly vision: VisionProfile = sight(6);
}

/** Pièce maîtresse : lente et myope, sa capture met fin à la partie (section 7). */
export class Commander extends PieceType {
  readonly kind: PieceKind = "commander";
  readonly movement: MovementProfile = ground(1);
  readonly vision: VisionProfile = sight(3);

  override get isCommander(): boolean {
    return true;
  }
}

export function provisionalRuleset(): Ruleset {
  return new Ruleset([new Scout(), new Commander()]);
}
