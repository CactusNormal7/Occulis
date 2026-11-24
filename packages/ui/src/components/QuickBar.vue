<script setup lang="ts">
/** Une rangée de `IconButton` : les actions rapides d'un objet, au même endroit d'une vue à l'autre. */
defineProps<{
  /** Un cadre fin autour de la rangée, pour la poser seule dans un en-tête. */
  framed?: boolean | undefined;
}>();
</script>

<template>
  <div :class="['occ-quick-bar', { 'occ-quick-bar--framed': framed }]">
    <slot />
  </div>
</template>
