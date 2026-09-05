import { type Board, type GameState, createGame, provisionalRuleset, scenarioFor } from "@occulis/core";

/**
 * Construit une partie depuis le registre partagé de `@occulis/core`.
 *
 * Le registre y vit et non ici, pour que le client dessine exactement la carte sur
 * laquelle le serveur calcule (docs/implementation-notes #12). Ce n'est PAS du contenu
 * de jeu acté : ni roster ni carte ne le sont (docs/design.md points ouverts 5 et 12).
 */
export const DEMO_SCENARIO = "demo-0";

/** Résout le scénario annoncé par le serveur (`ServerMessage.welcome`). */
export function boardForScenario(name: string): Board {
  return scenarioFor(name).board();
}

export function demoBoard(): Board {
  return boardForScenario(DEMO_SCENARIO);
}

export function demoGame(): GameState {
  const scenario = scenarioFor(DEMO_SCENARIO);
  return createGame(scenario.board(), provisionalRuleset(), [...scenario.pieces]);
}
