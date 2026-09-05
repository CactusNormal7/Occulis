import { Board, type GameState, type Piece, createGame, provisionalRuleset } from "@occulis/core";

/**
 * Scénario de démonstration du rendu. Ce n'est PAS du contenu de jeu : ni le roster
 * ni les cartes ne sont actés (docs/design.md points ouverts 5 et 12). Il n'existe
 * que pour donner à voir hauteur, occultation et fog of war sur un cas concret.
 */

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

export const DEMO_SCENARIO = "demo-0";

export function demoBoard(): Board {
  return Board.fromAscii(DEMO_MAP);
}

/**
 * Résout le scénario annoncé par le serveur (`ServerMessage.welcome`).
 *
 * DETTE CONNUE : cette carte est dupliquée dans `apps/server/src/scenarios.ts`. Tant
 * qu'elles sont identiques tout va bien, mais rien ne le garantit — et une divergence
 * ferait dessiner au client une carte différente de celle sur laquelle le serveur
 * calcule. Refuser un nom inconnu limite les dégâts sans supprimer le risque. Le
 * registre devra devenir partagé quand les cartes seront du contenu réel : aucune
 * n'est actée à ce jour (docs/design.md point ouvert 5).
 */
export function boardForScenario(name: string): Board {
  if (name !== DEMO_SCENARIO) throw new Error(`Scénario inconnu de ce client : "${name}"`);
  return demoBoard();
}

export function demoGame(): GameState {
  return createGame(demoBoard(), provisionalRuleset(), [...DEMO_PIECES]);
}
