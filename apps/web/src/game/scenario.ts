import { type Board, scenarioFor } from "@occulis/core";

/**
 * La carte du registre sous ce nom, telle qu'une **nouvelle** partie la figera : de quoi
 * préparer une équipe d'avance (`presets/`). Une partie en cours ou rejouée ne passe
 * jamais par ici — elle dessine les cases que le serveur a figées à sa création
 * (`welcome.board`, `board` des replays), même si le registre a changé depuis.
 */
export function boardForScenario(name: string): Board {
  return scenarioFor(name).board();
}
