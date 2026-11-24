<script setup lang="ts">
/** La barre de chargement indéterminée, sous le bord haut de la fenêtre. */
defineProps<{ active: boolean }>();
</script>

<template>
  <div class="occ-progress" :data-active="active" aria-hidden="true" />
</template>
