import { INK_ALPHA, PANEL_ALPHA, SURFACE, cssColor, cssVariables } from "@occulis/ui/tokens";
import { GEOMETRY, STATE } from "../theme.js";

/**
 * Passe le code couleur de `theme.ts` à la feuille de style de l'interface.
 *
 * Les tokens sont des entiers 0xRRGGBB, seul format utile à Pixi ; le CSS des écrans
 * du jeu les reçoit via des propriétés personnalisées calculées ici. Aucune couleur
 * n'est donc réécrite en dur dans `ui.css` : les valeurs restent celles de
 * `@occulis/ui/tokens` (docs/design.md 8.1). Le back-office, lui, lit directement la
 * feuille de `@occulis/ui`.
 */

export function applyPalette(root: HTMLElement): void {
  const variables: Record<string, string> = {
    // Toute la charte d'abord : les écrans natifs du jeu lisent aussi les `--occ-*`, sans
    // attendre qu'un îlot React ait chargé la feuille de `@occulis/ui`.
    ...cssVariables(),
    "--ink": cssColor(GEOMETRY.stroke),
    "--ink-soft": cssColor(GEOMETRY.stroke, INK_ALPHA.soft),
    "--ink-dim": cssColor(GEOMETRY.stroke, INK_ALPHA.dim),
    "--ink-faint": cssColor(GEOMETRY.stroke, INK_ALPHA.faint),
    "--panel": cssColor(SURFACE, PANEL_ALPHA),
    // Un coup accepté et un coup refusé sont de l'information de partie : ils
    // reprennent donc les tokens d'état, pas une couleur d'interface propre.
    "--accepted": cssColor(STATE.legalMove),
    "--refused": cssColor(STATE.threat),
  };

  for (const [name, value] of Object.entries(variables)) {
    root.style.setProperty(name, value);
  }
}
