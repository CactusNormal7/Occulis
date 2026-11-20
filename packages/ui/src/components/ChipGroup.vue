<script setup lang="ts">
/**
 * Des valeurs proposées d'un clic au-dessus d'un champ libre : des durées, des montants.
 * Aucune puce n'est marquée quand la valeur liée ne correspond à aucune.
 */
import type { ValueOption } from "../types.js";

defineProps<{ options: readonly ValueOption[] }>();

const value = defineModel<string | undefined>({ required: true });
</script>

<template>
  <div class="occ-chips">
    <button
      v-for="option in options"
      :key="option.label"
      type="button"
      :class="['occ-chip', { 'occ-chip--selected': option.value === value }]"
      @click="value = option.value"
    >
      {{ option.label }}
    </button>
  </div>
</template>
