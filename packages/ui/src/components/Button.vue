<script setup lang="ts">
/**
 * Un bouton à libellé, en capitales espacées, biseauté comme une touche. Il expose `focus()` :
 * un réglage y rend le focus quand son éditeur se referme (`SettingRow`).
 */
import { useTemplateRef } from "vue";
import type { IconName } from "../icons.js";
import Icon from "./Icon.vue";

withDefaults(
  defineProps<{
    /**
     * `default` : une touche biseautée au trait discret. `primary` : la confirmation, le seul
     * bouton plein — d'os, texte couleur du vide. `danger` : le geste destructeur, dans la
     * teinte des refus. `ghost` : sans cadre, pour « Annuler ».
     */
    variant?: "default" | "primary" | "danger" | "ghost" | undefined;
    size?: "sm" | "md" | undefined;
    /** Une icône avant le libellé. */
    icon?: IconName | undefined;
    type?: "button" | "submit" | "reset" | undefined;
  }>(),
  { variant: "default", size: "md", type: "button" },
);

const button = useTemplateRef<HTMLButtonElement>("button");

defineExpose({ focus: () => button.value?.focus() });
</script>

<template>
  <button
    ref="button"
    :type="type"
    :class="['occ-button', `occ-button--${variant}`, `occ-button--${size}`]"
  >
    <Icon v-if="icon !== undefined" :name="icon" :size="14" />
    <slot />
  </button>
</template>
