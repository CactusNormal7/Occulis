<script setup lang="ts">
/**
 * Une ligne choisissable : un vrai bouton (`aria-pressed`) pour la partie principale, et à
 * droite (emplacement `end`) ce qui reste interactif à part. La ligne choisie est marquée
 * du trait de la sélection — l'information « c'est celle-ci que vous déplacez ».
 */
import type { Camp } from "../types.js";

defineProps<{
  selected?: boolean | undefined;
  /** Atténué : un emplacement encore vide, un preset caduc. */
  muted?: boolean | undefined;
  /**
   * Le choix, lié par `@select`. Déclaré en prop pour savoir s'il est fourni : sans lui, la
   * ligne n'est qu'affichée, sans bouton.
   */
  onSelect?: (() => void) | undefined;
  /** Le camp dont la sélection prend la couleur. */
  camp?: Camp | undefined;
}>();
</script>

<template>
  <li
    :class="[
      'occ-choice',
      {
        'occ-choice--selected': selected,
        'occ-choice--muted': muted,
        [`occ-choice--${camp}`]: camp !== undefined,
      },
    ]"
  >
    <div v-if="onSelect === undefined" class="occ-choice__main"><slot /></div>
    <button
      v-else
      type="button"
      class="occ-choice__main"
      :aria-pressed="selected"
      @click="onSelect()"
    >
      <slot />
    </button>
    <div v-if="$slots.end !== undefined" class="occ-choice__end"><slot name="end" /></div>
  </li>
</template>
