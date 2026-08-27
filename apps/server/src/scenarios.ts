import { Board, type Piece } from "@occulis/core";

/**
 * Scénarios de départ, référencés par `matches.scenario`. Comme le registre de
 * rulesets, ce sont des données figées à la création d'une partie et rejouées à
 * l'identique lors de la reconstruction depuis le log d'actions.
 *
 * ATTENTION : ni le roster ni les cartes ne sont actés (docs/design.md points
 * ouverts 5 et 12). Celui-ci reprend la démo de rendu pour que le squelette tourne.
 */
export const DEFAULT_SCENARIO = "demo-0";

const DEMO_MAP = [
  "0000000000",
  "0011000000",
  "0013100000",
  "0001330000",
  "0000133000",
  "0000013100",
  "0000001100",
  "0000000000",
];

const DEMO_PIECES: readonly Piece[] = [
  { id: "a-scout", kind: "scout", owner: "A", coord: { x: 1, y: 6 } },
  { id: "a-cmd", kind: "commander", owner: "A", coord: { x: 0, y: 7 } },
  { id: "b-scout", kind: "scout", owner: "B", coord: { x: 8, y: 1 } },
  { id: "b-cmd", kind: "commander", owner: "B", coord: { x: 9, y: 0 } },
];

export function scenarioFor(name: string): { board: Board; pieces: readonly Piece[] } {
  if (name !== DEFAULT_SCENARIO) throw new Error(`Scénario introuvable : "${name}"`);
  return { board: Board.fromAscii(DEMO_MAP), pieces: DEMO_PIECES };
}
