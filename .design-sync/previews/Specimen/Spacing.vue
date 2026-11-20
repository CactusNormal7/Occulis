<script setup lang="ts">
import { Specimen } from "@occulis/ui";
</script>

<template>
  <div class="occ-stack">
    <Specimen v-for="step in [2, 4, 8]" :key="step" :name="`--occ-space-${step}`" :value="`step ${step}`">
      <span
        :style="{ display: 'block', width: `var(--occ-space-${step})`, height: '8px', background: 'var(--occ-ink-dim)' }"
      />
    </Specimen>
  </div>
</template>
