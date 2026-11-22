/**
 * Le repli de la colonne de droite de l'ATH, retenu d'une partie à l'autre dans ce
 * navigateur. Une commodité : sans stockage, la colonne s'ouvre dépliée.
 */
const COLUMN_STORAGE_KEY = "occulis.hud.column";

export function readColumnOpen(): boolean {
  try {
    return localStorage.getItem(COLUMN_STORAGE_KEY) !== "closed";
  } catch {
    return true;
  }
}

export function saveColumnOpen(open: boolean): void {
  try {
    localStorage.setItem(COLUMN_STORAGE_KEY, open ? "open" : "closed");
  } catch {
    // Stockage refusé (navigation privée) : le choix vaut pour la page ouverte.
  }
}
