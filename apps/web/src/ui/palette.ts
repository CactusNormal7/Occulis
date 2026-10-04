import { BACKGROUND, GEOMETRY, PLAYERS, STATE } from "../theme.js";

/**
 * Passe le code couleur de `theme.ts` à la feuille de style de l'interface.
 *
 * Les tokens sont des entiers 0xRRGGBB, seul format utile à Pixi ; le CSS les
 * reçoit via des propriétés personnalisées calculées ici. Aucune couleur n'est
 * donc réécrite en dur dans `ui.css`, et `theme.ts` reste l'unique détenteur du
 * code couleur du client (docs/design.md 8.1).
 */

export function cssColor(color: number, alpha = 1): string {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function applyPalette(root: HTMLElement): void {
  const variables: Record<string, string> = {
    "--ink": cssColor(GEOMETRY.stroke),
    "--ink-soft": cssColor(GEOMETRY.stroke, 0.55),
    "--ink-dim": cssColor(GEOMETRY.stroke, 0.35),
    "--ink-faint": cssColor(GEOMETRY.stroke, 0.2),
    "--panel": cssColor(BACKGROUND, 0.82),
    "--ground": cssColor(BACKGROUND),
    "--ink-ghost": cssColor(GEOMETRY.stroke, 0.05),
    "--ink-line": cssColor(GEOMETRY.stroke, 0.1),
    // Le back-office montre des parties : camps et sélection y gardent leur sens de jeu.
    "--camp-a": cssColor(PLAYERS.A),
    "--camp-b": cssColor(PLAYERS.B),
    "--selection": cssColor(STATE.selection),
    // Un coup accepté et un coup refusé sont de l'information de partie : ils
    // reprennent donc les tokens d'état, pas une couleur d'interface propre.
    "--accepted": cssColor(STATE.legalMove),
    "--refused": cssColor(STATE.threat),
  };

  for (const [name, value] of Object.entries(variables)) {
    root.style.setProperty(name, value);
  }
}
