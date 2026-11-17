import { INK_ALPHA, PANEL_ALPHA, cssColor, cssVariables } from "@occulis/ui/tokens";
import { look } from "@occulis/board/theme";

/**
 * Passe le code couleur du thème en vigueur (`theme.ts`) à la feuille de style de
 * l'interface.
 *
 * Les tokens sont des entiers 0xRRGGBB, seul format utile à Pixi ; le CSS des écrans
 * du jeu les reçoit via des propriétés personnalisées calculées ici. Aucune couleur
 * n'est donc réécrite en dur dans `ui.css` : les valeurs restent celles de
 * `@occulis/ui/tokens` (docs/design.md 8.1). Rappelée à chaque changement de thème
 * (`theme/theme-choice.ts`) : posées en ligne, ces propriétés l'emportent sur celles du
 * thème dans `tokens.css`.
 */
export function applyPalette(root: HTMLElement): void {
  const { name, palette } = look();
  const variables: Record<string, string> = {
    // Toute la charte d'abord : les écrans natifs du jeu lisent aussi les `--occ-*`, sans
    // attendre qu'un îlot React ait chargé la feuille de `@occulis/ui`.
    ...cssVariables(name),
    "--ink": cssColor(palette.ink),
    "--ink-soft": cssColor(palette.ink, INK_ALPHA.soft),
    "--ink-dim": cssColor(palette.ink, INK_ALPHA.dim),
    "--ink-faint": cssColor(palette.ink, INK_ALPHA.faint),
    "--panel": cssColor(palette.surface, PANEL_ALPHA),
    // Un coup accepté et un coup refusé sont de l'information de partie : ils
    // reprennent donc les tokens d'état, pas une couleur d'interface propre.
    "--accepted": cssColor(palette.state.legalMove),
    "--refused": cssColor(palette.state.threat),
  };

  for (const [property, value] of Object.entries(variables)) {
    root.style.setProperty(property, value);
  }
}
