<script setup lang="ts">
/**
 * Un panneau : cadre fin, angles vifs, sans fond. L'unité de mise en page de toute vue.
 *
 * Emplacements : `title` (remplace la prop du même nom), `action` (alignée à droite du
 * titre : un lien « tout voir », un bouton) et le contenu.
 */
defineProps<{
  /** Le titre, en petites capitales estompées. */
  title?: string | undefined;
  /** Le contenu touche les bords (un plateau, une barre d'outils pleine largeur). */
  flush?: boolean | undefined;
  /** Une ancre, pour qu'un lien mène droit à cette carte (`/profile/#security`). */
  id?: string | undefined;
}>();
</script>

<template>
  <section :id="id" :class="['occ-card', { 'occ-card--flush': flush }]">
    <header
      v-if="title !== undefined || $slots.title !== undefined || $slots.action !== undefined"
      class="occ-card__head"
    >
      <h3 v-if="title !== undefined || $slots.title !== undefined" class="occ-label">
        <slot name="title">{{ title }}</slot>
      </h3>
      <slot name="action" />
    </header>
    <slot />
  </section>
</template>
