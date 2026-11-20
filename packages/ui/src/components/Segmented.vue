<script setup lang="ts" generic="T extends string">
/**
 * Un choix exclusif entre quelques options : filtres de liste, point de vue. Une option à
 * `href` est un lien (un filtre porté par l'URL) ; les autres sont des boutons qui changent
 * la valeur liée par `v-model`.
 */
import type { SegmentedOption } from "../types.js";

defineProps<{
  options: readonly SegmentedOption<T>[];
  /** Le nom du groupe, pour les lecteurs d'écran. */
  label?: string | undefined;
}>();

const value = defineModel<T>({ required: true });

function optionClass(option: SegmentedOption<T>) {
  return [
    "occ-segmented__option",
    option.camp !== undefined && `occ-segmented__option--${option.camp}`,
  ];
}

function currentOf(option: SegmentedOption<T>): "true" | undefined {
  return option.value === value.value ? "true" : undefined;
}
</script>

<template>
  <nav class="occ-segmented" :aria-label="label">
    <template v-for="option in options" :key="option.value">
      <a
        v-if="option.href !== undefined"
        :class="optionClass(option)"
        :href="option.href"
        :aria-current="currentOf(option)"
      >
        {{ option.label }}
      </a>
      <button
        v-else
        type="button"
        :class="optionClass(option)"
        :aria-current="currentOf(option)"
        @click="value = option.value"
      >
        {{ option.label }}
      </button>
    </template>
  </nav>
</template>
