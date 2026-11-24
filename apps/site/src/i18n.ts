/**
 * Les textes du site, par langue. Ils vivent dans `content/<langue>/`, hors des
 * composants : on les retouche sans toucher au code.
 *
 * Le site est servi en anglais (`DEFAULT_LOCALE`). `content/fr/` reste à jour pour une
 * version française : elle s'ajoutera avec `src/pages/fr/`, les composants prennent déjà
 * la langue en paramètre.
 *
 * Exception assumée à la règle « tout texte passe par `@occulis/i18n` » (AGENTS.md) :
 * ce sont des contenus éditoriaux, pas des messages d'interface du jeu.
 */
import betaFr from "./content/fr/beta.json";
import boardFr from "./content/fr/board.json";
import conceptFr from "./content/fr/concept.json";
import faqFr from "./content/fr/faq.json";
import footerFr from "./content/fr/footer.json";
import heroFr from "./content/fr/hero.json";
import matchFr from "./content/fr/match.json";
import pagesFr from "./content/fr/pages.json";
import principlesFr from "./content/fr/principles.json";
import siteFr from "./content/fr/site.json";
import betaEn from "./content/en/beta.json";
import boardEn from "./content/en/board.json";
import conceptEn from "./content/en/concept.json";
import faqEn from "./content/en/faq.json";
import footerEn from "./content/en/footer.json";
import heroEn from "./content/en/hero.json";
import matchEn from "./content/en/match.json";
import pagesEn from "./content/en/pages.json";
import principlesEn from "./content/en/principles.json";
import siteEn from "./content/en/site.json";

const en = {
  site: siteEn,
  hero: heroEn,
  concept: conceptEn,
  principles: principlesEn,
  board: boardEn,
  match: matchEn,
  faq: faqEn,
  beta: betaEn,
  footer: footerEn,
  pages: pagesEn,
};

const fr = {
  site: siteFr,
  hero: heroFr,
  concept: conceptFr,
  principles: principlesFr,
  board: boardFr,
  match: matchFr,
  faq: faqFr,
  beta: betaFr,
  footer: footerFr,
  pages: pagesFr,
};

export type Content = typeof en;
export type Locale = "en" | "fr";

export const DEFAULT_LOCALE: Locale = "en";

const CONTENT: Record<Locale, Content> = { en, fr };

export function contentFor(locale: Locale = DEFAULT_LOCALE): Content {
  return CONTENT[locale];
}

/** Les codes que la route `/api/beta` renvoie, avec leur message dans la langue de la page. */
export type BetaMessage = keyof Content["beta"]["messages"];
