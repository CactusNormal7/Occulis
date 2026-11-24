<script setup lang="ts">
import { Swatch, SwatchGrid } from "@occulis/ui";

const inks = ["--occ-ink", "--occ-ink-soft", "--occ-ink-dim", "--occ-ink-faint"];
</script>

<template>
  <SwatchGrid>
    <Swatch v-for="name in inks" :key="name" :name="name" :color="`var(${name})`" :value="name.replace('--occ-', '')" />
  </SwatchGrid>
</template>
