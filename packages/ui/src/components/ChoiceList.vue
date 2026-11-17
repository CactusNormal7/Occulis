<script setup lang="ts">
/** Une liste d'éléments à choisir un par un : les emplacements d'une équipe, des presets. */
defineProps<{ label?: string }>();
</script>

<template>
  <ul class="occ-choices" :aria-label="label">
    <slot />
  </ul>
</template>
