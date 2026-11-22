import type { Framing, ScreenInsets } from "../view/camera.js";

/**
 * Ce que l'ATH couvre de l'écran, pour que la caméra cadre le plateau dans le reste.
 * Les mesures suivent `hud.css` : à changer ensemble.
 */

/** En deçà, la colonne de droite se replie sous le bandeau (`@media` de `hud.css`). */
const NARROW_WIDTH = 900;

/** L'écart au bord des panneaux, et entre un panneau et le plateau. */
const GAP = 16;
/** Les plaques des deux camps et le tour, en haut. */
const BANDS = 56;
/** La colonne de droite : fiche et journal. */
const COLUMN = 280;
/** Les boutons de caméra, à gauche. */
const CAMERA_BUTTONS = 32;
/** La légende des lueurs, en bas. */
const LEGEND = 24;
/** La fiche repliée en bas, sur un écran étroit. */
const FOLDED_SHEET = 180;

/** Un peu plus près que l'échelle 1 : le plateau remplit mieux la zone libre. */
export const HUD_SCALE = 1.25;

/**
 * `columnOpen` : la colonne de droite (fiche et journal) est dépliée. Repliée, elle rend
 * sa place au plateau.
 */
export function hudInsets(viewport: { readonly x: number }, columnOpen = true): ScreenInsets {
  const top = GAP + BANDS + GAP;
  const left = GAP + CAMERA_BUTTONS + GAP;
  if (viewport.x <= NARROW_WIDTH) {
    return { top, right: 0, bottom: columnOpen ? GAP + FOLDED_SHEET : GAP + LEGEND + GAP, left };
  }
  return { top, right: columnOpen ? GAP + COLUMN + GAP : GAP, bottom: GAP + LEGEND + GAP, left };
}

/** Le cadrage d'une partie : au milieu de ce que l'ATH laisse voir, à `HUD_SCALE`. */
export function hudFraming(viewport: { readonly x: number }, columnOpen = true): Framing {
  return { scale: HUD_SCALE, insets: hudInsets(viewport, columnOpen) };
}
