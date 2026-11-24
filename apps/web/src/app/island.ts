import { h, render, type Component } from "vue";
import type { Locale } from "@occulis/i18n";
import { UiRoot } from "@occulis/ui";
import "@occulis/ui/styles.css";

/**
 * Un îlot Vue dans la page du jeu : un écran de la charte posé dans un élément de la page,
 * que le reste du jeu (DOM natif, `ui/shell.ts`) pilote en lui passant ses propriétés.
 *
 * Rendre de nouveau avec d'autres propriétés met l'îlot à jour sans le remonter ;
 * `undefined` le vide. Le rendu de Vue (`render`) est **synchrone** : quand la fonction rend
 * la main, l'îlot est dessiné, et `shell.ts` peut montrer son écran sans qu'il paraisse vide.
 */
export interface IslandOptions {
  /** L'îlot occupe tout l'écran : fond de page, et contenu dans une page de la charte. */
  readonly fullPage?: boolean;
}

/**
 * Les propriétés d'un îlot : celles du composant, ses écouteurs (`onConfirm` pour l'événement
 * `confirm`), plus la langue que pose `UiRoot`. Le contrat `P` est écrit par l'appelant, qui
 * pilote l'îlot depuis du TypeScript sans gabarit.
 */
export type IslandProps<P> = P & { readonly locale: Locale };

export function mountIsland<P extends object>(
  host: HTMLElement,
  content: Component,
  options: IslandOptions = {},
): (props: IslandProps<P> | undefined) => void {
  const fullPage = options.fullPage === true;
  return (props) => {
    if (props === undefined) {
      render(null, host);
      return;
    }
    const { locale, ...contentProps } = props;
    const inner = () => h(content, contentProps);
    const body = fullPage ? () => h("main", { class: "occ-page" }, inner()) : inner;
    render(h(UiRoot, { locale, fullPage }, body), host);
  };
}
