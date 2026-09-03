import { type Ruleset, provisionalRuleset } from "@occulis/core";

/**
 * Registre des rulesets par version. Une partie référence la sienne dans
 * `matches.ruleset_version` et ne change jamais de version en cours de route, ce qui
 * suppose que les anciennes restent chargeables ici indéfiniment.
 *
 * Les types de pièces eux-mêmes vivent dans `@occulis/core` (`pieces/roster/`) :
 * client et serveur doivent appliquer exactement les mêmes règles, donc une seule
 * définition. Ce roster reste provisoire (docs/design.md point ouvert 12) et ne doit
 * servir de base à aucun équilibrage.
 */
const REGISTRY = new Map<string, Ruleset>([["provisional-0", provisionalRuleset()]]);

export const CURRENT_RULESET_VERSION = "provisional-0";

export function rulesetFor(version: string): Ruleset {
  const ruleset = REGISTRY.get(version);
  if (ruleset === undefined) {
    throw new Error(`Ruleset introuvable pour la version "${version}"`);
  }
  return ruleset;
}
