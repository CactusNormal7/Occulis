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
  /** Le plateau vu d'en haut : un carré de quatre cases. */
  planView: "M0 0h7v7h-7zM1 1h5v5h-5zM3 1h1v5h-1zM1 3h5v1h-5z",
  /** La colonne de droite dépliée : un cadre dont le tiers droit est plein. */
  columnOpen: "M0 1h8v6h-8zM1 2h3v4h-3z",
  /** La colonne de droite repliée : le même cadre, le tiers droit vide. */
  columnClosed: "M0 1h8v6h-8zM1 2h4v4h-4zM6 2h1v4h-1z",
  eye: "M0 4h1v-1h2v-1h2v1h2v1h1v1h-1v1h-2v1h-2v-1h-2v-1h-1zM3 4h2v1h-2z",
} as const;

export type HudIconName = keyof typeof HUD_ICONS;
