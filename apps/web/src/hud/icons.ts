/**
 * Les icônes de l'ATH, en pixels pleins comme les glyphes des pièces : un tracé SVG sur une
 * grille de 8 × 8 (`viewBox="0 0 8 8"`), rempli de `currentColor`. Reprises de la maquette
 * (docs/mockups/ath/a-bandeaux.html).
 */
export const HUD_ICONS = {
  turnLeft: "M4 1h1v1h-1zM3 2h1v1h-1zM2 3h1v2h-1zM3 5h1v1h-1zM4 6h1v1h-1z",
  turnRight: "M3 1h1v1h-1zM4 2h1v1h-1zM5 3h1v2h-1zM4 5h1v1h-1zM3 6h1v1h-1z",
  zoomIn: "M3 1h2v2h2v2h-2v2h-2v-2h-2v-2h2z",
  zoomOut: "M1 3h6v2h-6z",
  recenter:
    "M3 0h2v1h1v1h1v1h1v2h-1v1h-1v1h-1v1h-2v-1h-1v-1h-1v-1h-1v-2h1v-1h1v-1h1zM3 2h2v1h1v2h-1v1h-2v-1h-1v-2h1z",
  eye: "M0 4h1v-1h2v-1h2v1h2v1h1v1h-1v1h-2v1h-2v-1h-2v-1h-1zM3 4h2v1h-2z",
} as const;

export type HudIconName = keyof typeof HUD_ICONS;
