<script setup lang="ts">
/** Le lien de retour vers la liste parente, au-dessus d'une fiche. */
defineProps<{ href: string }>();
</script>

<template>
  <a class="occ-back-link" :href="href">← <slot /></a>
</template>
