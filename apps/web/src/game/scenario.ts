import { type Board, scenarioFor } from "@occulis/core";

/**
 * Résout le scénario annoncé par le serveur (`ServerMessage.welcome`).
 *
 * Le registre vit dans `@occulis/core` et non ici, pour que le client dessine
 * exactement la carte sur laquelle le serveur calcule (docs/implementation-notes #12).
 * Le client n'en choisit aucune : il ne connaît que celle qu'on lui annonce.
 */
export function boardForScenario(name: string): Board {
  return scenarioFor(name).board();
}
