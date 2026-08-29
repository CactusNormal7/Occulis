import { BACKGROUND, GEOMETRY, STATE } from "../theme.js";

/**
 * Passe le code couleur de `theme.ts` à la feuille de style de la console.
 *
 * Les tokens sont des entiers 0xRRGGBB, seul format utile à Pixi ; le CSS les
 * reçoit via des propriétés personnalisées calculées ici. Aucune couleur n'est
 * donc réécrite en dur dans `console.css`, et `theme.ts` reste l'unique détenteur
 * du code couleur du client (docs/design.md 8.1).
 */

function cssColor(color: number, alpha = 1): string {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function applyPalette(root: HTMLElement): void {
  const variables: Record<string, string> = {
    "--ink": cssColor(GEOMETRY.stroke),
    "--ink-soft": cssColor(GEOMETRY.stroke, 0.55),
    "--ink-faint": cssColor(GEOMETRY.stroke, 0.2),
    "--panel": cssColor(BACKGROUND, 0.82),
    // Un coup accepté et un coup refusé sont de l'information de partie : ils
    // reprennent donc les tokens d'état, pas une couleur d'interface propre.
    "--accepted": cssColor(STATE.legalMove),
    "--refused": cssColor(STATE.threat),
  };

  for (const [name, value] of Object.entries(variables)) {
    root.style.setProperty(name, value);
  }
}
