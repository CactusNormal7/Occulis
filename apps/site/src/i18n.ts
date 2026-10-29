/**
 * Les textes du site, par langue. Ils vivent dans `content/<langue>/`, hors des
 * composants : on les retouche sans toucher au code.
 *
 * Le site n'a qu'une langue pour l'instant. Une version anglaise s'ajoute en créant
 * `content/en/` sur le modèle de `content/fr/`, puis `src/pages/en/` — les composants
 * prennent déjà la langue en paramètre.
 *
 * Exception assumée à la règle « tout texte passe par `@occulis/i18n` » (AGENTS.md) :
 * ce sont des contenus éditoriaux, pas des messages d'interface du jeu.
 */
import beta from "./content/fr/beta.json";
import concept from "./content/fr/concept.json";
import differences from "./content/fr/differences.json";
import footer from "./content/fr/footer.json";
import gallery from "./content/fr/gallery.json";
import hero from "./content/fr/hero.json";
import pages from "./content/fr/pages.json";
import site from "./content/fr/site.json";

const fr = { site, hero, concept, differences, gallery, beta, footer, pages };

export type Content = typeof fr;
export type Locale = "fr";

export const DEFAULT_LOCALE: Locale = "fr";

const CONTENT: Record<Locale, Content> = { fr };

export function contentFor(locale: Locale = DEFAULT_LOCALE): Content {
  return CONTENT[locale];
}

/** Les codes que la route `/api/beta` renvoie, avec leur message dans la langue de la page. */
export type BetaMessage = keyof Content["beta"]["messages"];
