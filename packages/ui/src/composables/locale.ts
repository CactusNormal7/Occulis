import { computed, inject, provide, type ComputedRef, type InjectionKey } from "vue";
import { DEFAULT_LOCALE, type Locale, type Messages, messagesFor } from "@occulis/i18n";

/**
 * La langue de l'interface, transmise de `UiRoot` (ou `LocaleProvider`) à tous ses
 * descendants. C'est une valeur calculée : changer la langue d'une racine redessine aussitôt
 * tous les textes qu'elle contient.
 */
const LOCALE_KEY: InjectionKey<ComputedRef<Locale>> = Symbol("occulis-locale");

/** L'anglais, quand aucune racine n'a fixé de langue. */
const FALLBACK = computed(() => DEFAULT_LOCALE);

/**
 * Fixe la langue de tout ce que le composant appelant enveloppe. `chosen` rend `undefined`
 * pour garder celle de la racine englobante.
 */
export function provideLocale(chosen: () => Locale | undefined): void {
  const inherited = inject(LOCALE_KEY, FALLBACK);
  provide(
    LOCALE_KEY,
    computed(() => chosen() ?? inherited.value),
  );
}

/** La langue courante. */
export function useLocale(): ComputedRef<Locale> {
  return inject(LOCALE_KEY, FALLBACK);
}

/** Le dictionnaire de la langue courante — tout texte affiché passe par lui. */
export function useMessages(): ComputedRef<Messages> {
  const locale = useLocale();
  return computed(() => messagesFor(locale.value));
}
