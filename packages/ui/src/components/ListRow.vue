<script setup lang="ts">
/**
 * Une ligne de liste simple, sans colonnes : derniers inscrits, sessions ouvertes. Le
 * contenu principal (un `Person`, un titre et sa précision) est à gauche ; l'emplacement
 * `end` s'aligne à droite (des pastilles, un bouton).
 */
</script>

<template>
  <li class="occ-list-row">
    <div class="occ-list-row__main"><slot /></div>
    <slot name="end" />
  </li>
</template>
