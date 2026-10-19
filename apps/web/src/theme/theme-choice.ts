import { DEFAULT_THEME, type ThemeName, isThemeName } from "@occulis/ui/tokens";
import { THEME_STORAGE_KEY } from "@occulis/ui/critical";
import { setLook } from "./theme.js";

/**
 * Le thème choisi par le joueur : relu du stockage au chargement de chaque page, posé sur
 * `<html data-theme>` (que la feuille de la charte et le bloc critique lisent) et sur le
 * rendu (`setLook()`). Le bloc critique l'a déjà posé avant la première image ; ce module
 * ne fait que s'y accorder, puis porte les changements.
 */

export function storedTheme(): ThemeName {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeName(saved) ? saved : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

/** Applique un thème partout : stockage, document, rendu. Rend le thème appliqué. */
export function applyTheme(theme: ThemeName): ThemeName {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Stockage refusé (navigation privée) : le thème vaut pour la page ouverte.
  }
  document.documentElement.dataset["theme"] = theme;
  setLook(theme);
  return theme;
}
