import { Ruleset, type TeamRules } from "../ruleset.js";
import { Commander } from "./commander.js";
import { Pawn } from "./pawn.js";
import { Scout } from "./scout.js";

/**
 * Roster provisoire : une classe par fichier dans ce dossier, assemblées ici.
 *
 * ATTENTION : aucun roster n'est acté (docs/design.md point ouvert 12). Ces types
 * existent pour que le client, le serveur et les tests partagent une seule
 * définition au lieu de trois copies. Ce n'est PAS du contenu de jeu et il ne faut
 * pas bâtir d'équilibrage dessus.
 */
export { Commander } from "./commander.js";
export { Pawn } from "./pawn.js";
export { Scout } from "./scout.js";

/**
 * Une maîtresse, trois pièces à capacité (doublons permis : il n'en existe qu'un type),
 * quatre pions. Décision du porteur du projet ; seuls les types restent provisoires
 * (docs/design.md point ouvert 12).
 */
export const PROVISIONAL_TEAM: TeamRules = { commander: 1, special: 3, pawn: 4 };

/** Le roster provisoire courant : éclaireur, maîtresse, pion, et la composition d'équipe. */
export function provisionalRuleset(): Ruleset {
  return new Ruleset([new Commander(), new Scout(), new Pawn()], PROVISIONAL_TEAM);
}

/**
 * Le roster d'avant le déploiement, sans pion ni composition : celui des parties
 * `provisional-0`, qui partaient de la position de leur scénario.
 */
export function provisionalRulesetV0(): Ruleset {
  return new Ruleset([new Scout(), new Commander()]);
}
