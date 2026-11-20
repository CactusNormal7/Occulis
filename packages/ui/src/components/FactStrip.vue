<script setup lang="ts">
/** Des faits courts sur une seule bande cloisonnée : dates, règles, identifiants. */
import type { Fact } from "../types.js";

defineProps<{ facts: readonly Fact[] }>();
</script>

<template>
  <div class="occ-fact-strip">
    <div v-for="fact in facts" :key="fact.label" class="occ-fact">
      <span class="occ-label">{{ fact.label }}</span>
      <strong>
        <code v-if="fact.code === true">{{ fact.value }}</code>
        <template v-else>{{ fact.value }}</template>
      </strong>
    </div>
  </div>
</template>
