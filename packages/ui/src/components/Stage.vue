<script setup lang="ts">
/**
 * Le cadre d'un aperçu vivant : un fond de vide, un trait pointillé, une marge. Ce qui est
 * dedans est le vrai composant, pas une image. L'emplacement `actions` aligne des boutons
 * à droite du titre : rejouer, montrer le code.
 */
defineProps<{
  /** Le nom de ce qui est montré : une variante, une animation. */
  title?: string | undefined;
}>();
</script>

<template>
  <section class="occ-stage">
    <header v-if="title !== undefined || $slots.actions !== undefined" class="occ-stage__head">
      <h4 v-if="title !== undefined" class="occ-label">{{ title }}</h4>
      <div v-if="$slots.actions !== undefined" class="occ-stage__actions">
        <slot name="actions" />
      </div>
    </header>
    <div class="occ-stage__body"><slot /></div>
  </section>
</template>
