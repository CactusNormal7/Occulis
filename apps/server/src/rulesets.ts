import { Ruleset } from "@occulis/core";

/**
 * Registre des rulesets par version. Une partie référence la sienne dans
 * `matches.ruleset_version` et ne change jamais de version en cours de route, ce qui
 * suppose que les anciennes restent chargeables ici indéfiniment.
 *
 * ATTENTION : aucun roster n'est acté (docs/design.md point ouvert 12). Les
 * définitions ci-dessous sont celles de la démo de rendu, reprises telles quelles
 * pour que le squelette tourne. Ce n'est PAS du contenu de jeu et il ne faut pas
 * bâtir d'équilibrage dessus.
 */
const PROVISIONAL = new Ruleset([
  {
    kind: "scout",
    movement: { steps: 3, adjacency: "octile", canClimb: true },
    vision: { range: 6 },
    isCommander: false,
  },
  {
    kind: "commander",
    movement: { steps: 1, adjacency: "octile", canClimb: true },
    vision: { range: 3 },
    isCommander: true,
  },
]);

const REGISTRY = new Map<string, Ruleset>([["provisional-0", PROVISIONAL]]);

export const CURRENT_RULESET_VERSION = "provisional-0";

export function rulesetFor(version: string): Ruleset {
  const ruleset = REGISTRY.get(version);
  if (ruleset === undefined) {
    throw new Error(`Ruleset introuvable pour la version "${version}"`);
  }
  return ruleset;
}
