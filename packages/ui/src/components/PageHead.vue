<script setup lang="ts">
/**
 * L'en-tête d'une vue : titre en capitales espacées, total, et à droite les outils de la vue
 * (emplacement `tools` : recherche, filtre, création).
 */
defineProps<{
  title: string;
  /** Un total, à côté du titre. */
  count?: number | undefined;
}>();
</script>

<template>
  <div class="occ-page-head">
    <h2>
      {{ title }}
      <span v-if="count !== undefined" class="occ-count">{{ count }}</span>
    </h2>
    <div v-if="$slots.tools !== undefined" class="occ-page-head__tools">
      <slot name="tools" />
    </div>
  </div>
</template>
