<script setup lang="ts">
/**
 * L'en-tête d'une fiche : qui ou quoi, son état, et ce qu'on peut en faire.
 *
 * Emplacements : `avatar` (l'insigne en grand, `TileAvatar size="lg"`), `badges` (les
 * pastilles d'état, à côté du titre), `meta` (les métadonnées, sur une ligne estompée sous le
 * titre : un `<span>` par élément) et `actions` (à droite, une `QuickBar framed`).
 */
defineProps<{ title: string }>();
</script>

<template>
  <section class="occ-hero">
    <slot name="avatar" />
    <div class="occ-hero__text">
      <h2>
        {{ title }}
        <slot name="badges" />
      </h2>
      <p v-if="$slots.meta !== undefined" class="occ-hero__meta">
        <slot name="meta" />
      </p>
    </div>
    <div v-if="$slots.actions !== undefined" class="occ-hero__actions">
      <slot name="actions" />
    </div>
  </section>
</template>
