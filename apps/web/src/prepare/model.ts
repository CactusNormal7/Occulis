import { type PlayerId, type TeamEntry, scenarioFor, teamForSide } from "@occulis/core";
import type { TeamPreset } from "@occulis/protocol";

/**
 * Ce que décident les écrans d'avant-partie — fenêtre d'acceptation, annonce,
 * déploiement — sans DOM ni horloge : l'heure leur est passée.
 */

/**
 * Le temps qui reste, à partir de ce que le serveur annonçait (`remainingMs`) et de
 * l'instant où le message est arrivé, mesurés sur l'horloge **du client** : le serveur
 * envoie une durée et non une échéance, l'écart entre les deux horloges ne compte donc pas.
 */
export function remainingAt(remainingMs: number, receivedAt: number, now: number): number {
  return Math.max(0, remainingMs - Math.max(0, now - receivedAt));
}

export function secondsLeft(ms: number): number {
  return Math.ceil(ms / 1000);
}

/**
 * Juste avant l'échéance, un brouillon complet et valide part de lui-même : le joueur qui
 * a tout posé sans verrouiller garde son placement plutôt que celui par défaut. Le délai
 * laisse au message le temps d'arriver avant l'alarme du serveur.
 */
export const AUTO_SEND_MS = 1500;

export function shouldAutoSend(remaining: number, valid: boolean, locked: boolean, sent: boolean): boolean {
  return remaining <= AUTO_SEND_MS && valid && !locked && !sent;
}

/** Les presets jouables dans cette partie : valides, et préparés pour sa carte et ses règles. */
export function usablePresets(presets: readonly TeamPreset[], scenario: string, rulesetVersion: string): TeamPreset[] {
  return presets.filter((preset) => preset.valid && preset.scenario === scenario && preset.rulesetVersion === rulesetVersion);
}

/**
 * Une équipe préparée, posée dans la zone du camp tenu : un preset s'écrit dans celle du
 * camp A (`TeamPreset`), la carte dit comment la transposer.
 */
export function presetTeam(preset: TeamPreset, side: PlayerId): TeamEntry[] {
  const deployment = scenarioFor(preset.scenario).deployment;
  return deployment === undefined ? [...preset.team] : teamForSide(deployment, preset.team, side);
}

/** L'équipe qui se précharge : le preset par défaut s'il est jouable ici, sinon celle de la carte. */
export function initialTeam(
  presets: readonly TeamPreset[],
  scenario: string,
  rulesetVersion: string,
  side: PlayerId,
  fallback: readonly TeamEntry[],
): readonly TeamEntry[] {
  const preferred = usablePresets(presets, scenario, rulesetVersion).find((preset) => preset.isDefault);
  return preferred === undefined ? fallback : presetTeam(preferred, side);
}
