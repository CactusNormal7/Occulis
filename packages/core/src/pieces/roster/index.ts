import { Ruleset, STRICT_CHESS_RULES, type TeamRules } from "../ruleset.js";
import { Commander } from "./commander.js";
import { legacyCommander, legacyPawn, legacyScout } from "./legacy.js";
import { Pawn } from "./pawn.js";
import { Scout } from "./scout.js";
import { Trapper } from "./trapper.js";

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
export { Trapper } from "./trapper.js";

/**
 * Un roi, trois pièces à capacité (doublons permis, éclaireurs et trappeurs mêlés), deux
 * pions. Décision du porteur du projet du 2026-10-27, pour des parties plus rapides ;
 * seuls les types restent provisoires (docs/design.md point ouvert 12).
 */
export const PROVISIONAL_TEAM: TeamRules = { commander: 1, special: 3, pawn: 2 };

/** La composition d'avant le 2026-10-27, celle des parties `provisional-1` : quatre pions. */
export const PROVISIONAL_TEAM_V1: TeamRules = { commander: 1, special: 3, pawn: 4 };

/**
 * Le roster provisoire courant, celui des parties `provisional-4` : celui de
 * `provisional-3`, plus le trappeur et son piège (décision du 2026-11-20).
 */
export function provisionalRuleset(): Ruleset {
  return new Ruleset(
    [new Commander(), new Scout(), new Trapper(), new Pawn()],
    PROVISIONAL_TEAM,
    STRICT_CHESS_RULES,
  );
}

/**
 * Les parties `provisional-3` : portées resserrées, prise à l'arrivée, échec et mat,
 * nulles (décisions du 2026-11-16), sans aucune capacité.
 */
export function provisionalRulesetV3(): Ruleset {
  return new Ruleset(
    [new Commander(), new Scout(), new Pawn()],
    PROVISIONAL_TEAM,
    STRICT_CHESS_RULES,
  );
}

/** Les parties `provisional-2` : six pièces, anciennes portées, aucune prise. */
export function provisionalRulesetV2(): Ruleset {
  return new Ruleset([legacyCommander(), legacyScout(), legacyPawn()], PROVISIONAL_TEAM);
}

/** Les mêmes types sous la composition à huit pièces : le ruleset des parties `provisional-1`. */
export function provisionalRulesetV1(): Ruleset {
  return new Ruleset([legacyCommander(), legacyScout(), legacyPawn()], PROVISIONAL_TEAM_V1);
}

/**
 * Le roster d'avant le déploiement, sans pion ni composition : celui des parties
 * `provisional-0`, qui partaient de la position de leur scénario.
 */
export function provisionalRulesetV0(): Ruleset {
  return new Ruleset([legacyScout(), legacyCommander()]);
}
