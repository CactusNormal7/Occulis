import {
  type Ruleset,
  provisionalRuleset,
  provisionalRulesetV0,
  provisionalRulesetV1,
  provisionalRulesetV2,
  provisionalRulesetV3,
  provisionalRulesetV4,
} from "../pieces/index.js";

/**
 * Registre des rulesets par version. Une partie référence la sienne
 * (`matches.ruleset_version`) et n'en change jamais en cours de route, ce qui suppose
 * que les anciennes restent chargeables indéfiniment (docs/architecture.md section 1).
 *
 * Il vit dans `core`, comme le roster et les scénarios (docs/implementation-notes #12) :
 * le client doit appliquer les règles de la partie qu'il joue, pas les plus récentes
 * qu'il connaisse — il lit donc la version que lui annonce le serveur.
 */
const REGISTRY = new Map<string, Ruleset>([
  ["provisional-0", provisionalRulesetV0()],
  ["provisional-1", provisionalRulesetV1()],
  ["provisional-2", provisionalRulesetV2()],
  ["provisional-3", provisionalRulesetV3()],
  ["provisional-4", provisionalRulesetV4()],
  ["provisional-5", provisionalRuleset()],
]);

/**
 * Depuis le 2026-11-24 : déplacements proches des échecs — roi étendu en ligne droite,
 * fou, tour, pion de deux pas. Avant (`provisional-4`, 2026-11-20) : le trappeur et son piège.
 */
export const CURRENT_RULESET_VERSION = "provisional-5";

export function rulesetFor(version: string): Ruleset {
  const ruleset = REGISTRY.get(version);
  if (ruleset === undefined) throw new Error(`Ruleset not found for version "${version}"`);
  return ruleset;
}
