import type { HTMLAttributes } from "react";
import type { Locale } from "@occulis/i18n";
import { cx } from "../cx.js";
import { LocaleProvider } from "./Locale.js";

export interface UiRootProps extends HTMLAttributes<HTMLDivElement> {
  /** Couvre la fenêtre entière (une page) plutôt que son seul contenu (un encart). */
  fullPage?: boolean | undefined;
  /** La langue des textes ; sans elle, celle d'un `LocaleProvider` englobant, sinon l'anglais. */
  locale?: Locale | undefined;
}

/**
 * La racine de toute interface Occulis : fond, encre, police monospace et taille de base.
 * Sans elle, les composants restent fonctionnels mais héritent de la typographie et du
 * fond de la page hôte.
 */
export function UiRoot({ fullPage = false, locale, className, ...rest }: UiRootProps) {
  const root = <div className={cx("occ-root", fullPage && "occ-root--page", className)} lang={locale} {...rest} />;
  return locale === undefined ? root : <LocaleProvider locale={locale}>{root}</LocaleProvider>;
}
