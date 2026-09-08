import { DEMO } from "./demo.js";
import type { Scenario } from "./scenario.js";

export type { Scenario } from "./scenario.js";

/**
 * Registre des scénarios, comme `Ruleset` l'est des types de pièces. Un scénario est
 * figé à la création d'une partie et rejoué à l'identique lors de la reconstruction
 * depuis le log d'actions : **ne jamais en retirer un** tant qu'une partie peut le
 * référencer (docs/architecture.md section 1).
 */
const REGISTRY = new Map<string, Scenario>([[DEMO.name, DEMO]]);

export const DEFAULT_SCENARIO = DEMO.name;

export function scenarioFor(name: string): Scenario {
  const scenario = REGISTRY.get(name);
  if (scenario === undefined) throw new Error(`Scénario introuvable : "${name}"`);
  return scenario;
}
