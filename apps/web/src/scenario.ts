import {
  Board,
  type GameState,
  type Piece,
  Ruleset,
  createGame,
} from "@occulis/core";

/**
 * Scénario de démonstration du rendu. Ce n'est PAS du contenu de jeu : ni le roster
 * ni les cartes ne sont actés (docs/design.md points ouverts 5 et 12). Il n'existe
 * que pour donner à voir hauteur, occultation et fog of war sur un cas concret.
 */
const DEMO_RULESET = new Ruleset([
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

/** Une arête rocheuse en diagonale coupe la carte en deux moitiés sans vue mutuelle. */
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

export function demoBoard(): Board {
  return Board.fromAscii(DEMO_MAP);
}

export function demoGame(): GameState {
  return createGame(demoBoard(), DEMO_RULESET, [...DEMO_PIECES]);
}
