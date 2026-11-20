import { computed, useAttrs, useId, type ComputedRef } from "vue";

/**
 * Ce que les champs libellés (`TextField`, `PasswordField`, `SelectField`) partagent.
 *
 * Un champ est un `<label>` qui **enveloppe** son contrôle : c'est ce qui les associe pour
 * les lecteurs d'écran comme pour les gestionnaires de mots de passe, sans identifiant à
 * tenir. Les attributs passés au composant (`name`, `autocomplete`, `required`…) vont donc
 * au contrôle, sauf `class` et `style`, qui habillent le libellé.
 */
export function useFieldAttributes(): {
  rootAttributes: ComputedRef<Record<string, unknown>>;
  controlAttributes: ComputedRef<Record<string, unknown>>;
} {
  const attrs = useAttrs();
  return {
    rootAttributes: computed(() => ({ class: attrs.class, style: attrs.style })),
    controlAttributes: computed(() => {
      const { class: _class, style: _style, ...control } = attrs;
      return control;
    }),
  };
}

/**
 * Les identifiants de l'aide et de l'erreur d'un champ, et la valeur d'`aria-describedby`
 * qui les rattache au contrôle. L'erreur passe avant l'aide : c'est elle qu'on doit lire.
 */
export function useFieldDescription(
  hasHint: () => boolean,
  hasError: () => boolean,
): {
  hintId: string;
  errorId: string;
  describedBy: ComputedRef<string | undefined>;
} {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = computed(() => {
    const ids = [hasError() ? errorId : undefined, hasHint() ? hintId : undefined];
    const present = ids.filter((value) => value !== undefined);
    return present.length === 0 ? undefined : present.join(" ");
  });
  return { hintId, errorId, describedBy };
}
