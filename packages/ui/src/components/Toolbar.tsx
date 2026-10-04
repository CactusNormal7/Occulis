import type { ReactNode } from "react";

/**
 * Une barre d'outils pleine largeur, cloisonnée au-dessus et au-dessous : commandes de
 * lecture, filtres, rotation. Faite pour la dernière section d'une `Card flush`.
 */
export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="occ-toolbar">{children}</div>;
}

/** Le texte d'état d'une `Toolbar`, qui prend la place restante : « coup 3 / 11 — A · anne ». */
export function ToolbarText({ children }: { children: ReactNode }) {
  return <span className="occ-toolbar__text">{children}</span>;
}
