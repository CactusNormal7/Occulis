import type { HTMLAttributes } from "react";
import { cx } from "../cx.js";

export interface UiRootProps extends HTMLAttributes<HTMLDivElement> {
  /** Couvre la fenêtre entière (une page) plutôt que son seul contenu (un encart). */
  fullPage?: boolean | undefined;
}

/**
 * La racine de toute interface Occulis : fond, encre, police monospace et taille de base.
 * Sans elle, les composants restent fonctionnels mais héritent de la typographie et du
 * fond de la page hôte.
 */
export function UiRoot({ fullPage = false, className, ...rest }: UiRootProps) {
  return <div className={cx("occ-root", fullPage && "occ-root--page", className)} {...rest} />;
}
