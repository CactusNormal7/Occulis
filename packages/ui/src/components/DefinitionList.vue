<script setup lang="ts">
/** Des paires terme / valeur, en deux colonnes. */
import type { Fact } from "../types.js";

defineProps<{ entries: readonly Fact[] }>();
</script>

<template>
  <dl class="occ-definitions">
    <div v-for="entry in entries" :key="entry.label">
      <dt>{{ entry.label }}</dt>
      <dd>{{ entry.value }}</dd>
    </div>
  </dl>
</template>
