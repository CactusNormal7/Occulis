import { Board } from "../board.js";
import { DEMO } from "./demo.js";
import { RIDGE } from "./ridge.js";
import type { Scenario } from "./scenario.js";
import type { ScenarioSnapshot } from "./snapshot.js";

export type { Scenario } from "./scenario.js";
export { type ScenarioSnapshot, snapshotScenario } from "./snapshot.js";

/**
 * Registre des scénarios, comme `Ruleset` l'est des types de pièces. Un scénario est
 * figé à la création d'une partie et rejoué à l'identique lors de la reconstruction
 * depuis le log d'actions : **ne jamais en retirer un** tant qu'une partie peut le
 * référencer (docs/architecture.md section 1).
 */
const REGISTRY = new Map<string, Scenario>([
  [DEMO.name, DEMO],
  [RIDGE.name, RIDGE],
]);

/** La carte des nouvelles parties. `demo-0`, sans déploiement, ne sert plus qu'aux parties déjà jouées. */
export const DEFAULT_SCENARIO = RIDGE.name;

export function scenarioFor(name: string): Scenario {
  const scenario = REGISTRY.get(name);
  if (scenario === undefined) throw new Error(`Scenario not found: "${name}"`);
  return scenario;
}

/**
 * La carte d'une partie : celle qu'elle a figée à sa création, ou — pour une partie
 * d'avant les cartes figées — celle du registre sous son nom.
 */
export function frozenScenario(name: string, snapshot: ScenarioSnapshot | null | undefined): Scenario {
  if (snapshot === null || snapshot === undefined) return scenarioFor(name);
  const scenario = { name: snapshot.name, board: () => new Board(snapshot.tiles), pieces: snapshot.pieces };
  return snapshot.deployment === undefined ? scenario : { ...scenario, deployment: snapshot.deployment };
}
