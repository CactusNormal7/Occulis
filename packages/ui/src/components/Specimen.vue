<script setup lang="ts">
/**
 * Un token montré par son effet, à côté de son nom et de sa valeur. Le contenu est ce que
 * le token produit : une barre de l'écart, un texte à la taille, un point qui bouge.
 */
defineProps<{
  /** Le nom du token ou de la règle. */
  name: string;
  /** Sa valeur. */
  value?: string | undefined;
}>();
</script>

<template>
  <div class="occ-specimen">
    <div class="occ-specimen__visual"><slot /></div>
    <span class="occ-specimen__name">{{ name }}</span>
    <code v-if="value !== undefined" class="occ-specimen__value">{{ value }}</code>
  </div>
</template>
