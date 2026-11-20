<script setup lang="ts">
/** Un bouton carré à icône, avec infobulle. La brique des barres d'actions rapides. */
import type { IconName } from "../icons.js";
import Icon from "./Icon.vue";

withDefaults(
  defineProps<{
    icon: IconName;
    /** Le libellé accessible, montré en infobulle au survol. Obligatoire : une icône seule ne dit rien. */
    label: string;
    /** Le geste est destructeur : la teinte des refus au survol. */
    danger?: boolean | undefined;
    /**
     * Rend le bouton inactif et remplace l'infobulle par la raison. Préférer ceci à
     * `disabled` seul : un bouton grisé sans explication n'apprend rien.
     */
    disabledReason?: string | undefined;
    disabled?: boolean | undefined;
    /** Côté où s'ouvre l'infobulle quand le bouton touche le bord droit d'un conteneur. */
    tipAlign?: "center" | "end" | undefined;
    type?: "button" | "submit" | undefined;
  }>(),
  { tipAlign: "center", type: "button" },
);
</script>

<template>
  <button
    :type="type"
    :aria-label="label"
    :data-tip="disabledReason ?? label"
    :disabled="disabledReason !== undefined || disabled"
    :class="[
      'occ-icon-button',
      { 'occ-icon-button--danger': danger, 'occ-tip--end': tipAlign === 'end' },
    ]"
  >
    <Icon :name="icon" />
  </button>
</template>
