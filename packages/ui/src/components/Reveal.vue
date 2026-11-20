<script setup lang="ts">
/**
 * L'annonce d'une partie : les deux plaques (emplacements `self` et `opponent`) entrent
 * chacune de son côté, le « vs » se pose entre elles. Puis, `compact`, l'annonce se range en
 * un bandeau. L'emplacement `footer` s'aligne sous l'affrontement (classée ou non). Les
 * animations ne portent aucune information : sous mouvement réduit, tout est simplement là.
 */
defineProps<{
  /** Le mot entre les deux : « vs ». */
  versus: string;
  /** Réduite en bandeau, une fois l'annonce faite. */
  compact?: boolean | undefined;
}>();
</script>

<template>
  <section :class="['occ-reveal', { 'occ-reveal--compact': compact }]" aria-live="polite">
    <div class="occ-reveal__side occ-reveal__side--self"><slot name="self" /></div>
    <span class="occ-reveal__versus">{{ versus }}</span>
    <div class="occ-reveal__side occ-reveal__side--opponent"><slot name="opponent" /></div>
    <div v-if="$slots.footer !== undefined" class="occ-reveal__footer">
      <slot name="footer" />
    </div>
  </section>
</template>
