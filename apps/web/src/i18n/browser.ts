import { LOCALE_COOKIE, LOCALE_STORAGE_KEY, type Locale, localeFromCookie, lookup, resolveLocale } from "@occulis/i18n";
import { currentLocale, messages, onLocaleChange, setLocale } from "./current.js";

/**
 * Le choix de langue dans le navigateur : lu au chargement, enregistré au changement.
 * Il vit dans le stockage local **et** dans un cookie — le premier pour les pages, le
 * second pour que le serveur écrive ses courriers dans la même langue.
 */
const ONE_YEAR = 60 * 60 * 24 * 365;

export function initLocale(): Locale {
  let saved: string | null | undefined;
  try {
    saved = localStorage.getItem(LOCALE_STORAGE_KEY);
  } catch {
    saved = undefined;
  }
  saved ??= localeFromCookie(document.cookie);
  setLocale(resolveLocale(saved, navigator.languages));
  document.documentElement.lang = currentLocale();
  onLocaleChange((locale) => {
    document.documentElement.lang = locale;
  });
  return currentLocale();
}

export function chooseLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Stockage refusé : le cookie suffit à retenir le choix.
  }
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${ONE_YEAR}; SameSite=Lax`;
  setLocale(locale);
}

/**
 * Remplit le HTML statique : `data-i18n` donne le texte d'un élément, `data-i18n-placeholder`
 * et `data-i18n-label` son indication et son `aria-label`. Un chemin inconnu laisse
 * l'élément tel quel, pour qu'un oubli se voie à l'écran plutôt que de le vider.
 */
export function translateDom(root: ParentNode): void {
  const m = messages();
  for (const element of root.querySelectorAll<HTMLElement>("[data-i18n]")) {
    const text = lookup(m, element.dataset["i18n"] ?? "");
    if (text !== undefined) element.textContent = text;
  }
  for (const element of root.querySelectorAll<HTMLInputElement>("[data-i18n-placeholder]")) {
    const text = lookup(m, element.dataset["i18nPlaceholder"] ?? "");
    if (text !== undefined) element.placeholder = text;
  }
  for (const element of root.querySelectorAll<HTMLElement>("[data-i18n-label]")) {
    const text = lookup(m, element.dataset["i18nLabel"] ?? "");
    if (text !== undefined) element.setAttribute("aria-label", text);
  }
}
