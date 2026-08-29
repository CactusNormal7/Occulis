import { Ruleset } from "../ruleset.js";
import { Commander } from "./commander.js";
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
export { Scout } from "./scout.js";

export function provisionalRuleset(): Ruleset {
  return new Ruleset([new Scout(), new Commander()]);
}
