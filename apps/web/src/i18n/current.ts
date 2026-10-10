import { DEFAULT_LOCALE, type Locale, type Messages, messagesFor } from "@occulis/i18n";

/**
 * La langue courante du client, sans DOM : les modules purs (`ui/messages.ts`, les
 * `model.ts`) y lisent leurs textes, et restent éprouvables — les tests tournent en
 * anglais, la langue par défaut. Le choix, sa persistance et `<html lang>` sont l'affaire
 * de `browser.ts`.
 */
let locale: Locale = DEFAULT_LOCALE;
const listeners = new Set<(locale: Locale) => void>();

export function currentLocale(): Locale {
  return locale;
}

/** Le dictionnaire de la langue courante. */
export function messages(): Messages {
  return messagesFor(locale);
}

export function setLocale(next: Locale): void {
  if (next === locale) return;
  locale = next;
  for (const listener of listeners) listener(next);
}

/** Prévient d'un changement de langue ; rend de quoi se désabonner. */
export function onLocaleChange(listener: (locale: Locale) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
