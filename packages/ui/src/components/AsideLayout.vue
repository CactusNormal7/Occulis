<script setup lang="ts">
/**
 * Une colonne étroite à gauche (emplacement `aside` : navigation, réglages), le contenu à
 * droite.
 */
</script>

<template>
  <div class="occ-aside-layout">
    <aside class="occ-aside-layout__aside"><slot name="aside" /></aside>
    <div class="occ-aside-layout__main"><slot /></div>
  </div>
</template>
