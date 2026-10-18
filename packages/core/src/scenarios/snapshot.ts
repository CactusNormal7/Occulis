import type { Tile } from "../board.js";
import type { Piece } from "../pieces/index.js";
import type { Deployment } from "../team.js";
import type { Scenario } from "./scenario.js";

/**
 * Une carte figée, sous une forme qui se sérialise : ses cases, sa position fixe et son
 * déploiement, sans fabrique.
 *
 * Une partie la reçoit à sa création et ne la quitte plus. Le nom seul ne suffisait
 * pas : retoucher une carte du registre aurait changé, sans bruit, les parties en cours
 * et les replays des parties finies, alors que les règles, elles, sont versionnées par
 * partie (docs/architecture.md section 1).
 */
export interface ScenarioSnapshot {
  readonly name: string;
  readonly tiles: readonly Tile[];
  readonly pieces: readonly Piece[];
  readonly deployment?: Deployment;
}

export function snapshotScenario(scenario: Scenario): ScenarioSnapshot {
  const snapshot = {
    name: scenario.name,
    tiles: [...scenario.board().allTiles()],
    pieces: [...scenario.pieces],
  };
  return scenario.deployment === undefined
    ? snapshot
    : { ...snapshot, deployment: scenario.deployment };
}
