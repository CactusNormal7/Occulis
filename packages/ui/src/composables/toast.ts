import { inject, type InjectionKey } from "vue";

/** Émet un message éphémère ; `ok` faux pour un refus. */
export type Notify = (text: string, ok?: boolean) => void;

export const TOAST_KEY: InjectionKey<Notify> = Symbol("occulis-toast");

/**
 * Émet un message éphémère depuis n'importe quel descendant d'un `ToastProvider` :
 * `notify("Compte suspendu.")`, ou `notify(raison, false)` pour un refus. Hors d'un
 * fournisseur, les messages se perdent sans bruit.
 */
export function useToast(): Notify {
  return inject(TOAST_KEY, () => undefined);
}
