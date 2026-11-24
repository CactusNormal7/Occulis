<script setup lang="ts">
/**
 * Un bloc de lignes grises sans rôle propre, la brique des squelettes. Interne à la charte :
 * `Skeleton` l'annonce aux lecteurs d'écran, `SkeletonScreen` annonce l'écran entier.
 */
defineProps<{
  lines: number;
  /** Encadré comme une `Card` : la place d'un bloc plutôt que d'un paragraphe. */
  card?: boolean | undefined;
}>();
</script>

<template>
  <div :class="['occ-skeleton', { 'occ-skeleton--card': card }]">
    <span v-for="line in lines" :key="line" class="occ-skeleton__line" />
  </div>
</template>
