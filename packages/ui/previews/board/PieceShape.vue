<script setup lang="ts">
/**
 * La silhouette d'une pièce, posée sur l'origine (le centre de sa case). Le rôle se lit à la
 * forme seule, jamais à la couleur : le roi porte un œil cranté au sommet d'un mât, la
 * pièce à capacité un losange et une pointe, le pion un mât court penché et un chevron.
 */
import type { Role } from "../board-mock.js";

defineProps<{ role: Role }>();
</script>

<template>
  <template v-if="role === 'master'">
    <polygon points="-10,0 0,-5 10,0 0,5" />
    <polyline points="0,0 0,-22" />
    <polyline points="-6,2 0,-10 6,2" fill="none" />
    <polygon points="-2,-31 2,-31 4,-29 4,-25 2,-23 -2,-23 -4,-25 -4,-29" />
    <rect x="-0.5" y="-27.5" width="1" height="1" />
  </template>
  <template v-else-if="role === 'ability'">
    <polygon points="-10,0 0,-5 10,0 0,5" />
    <polyline points="0,0 0,-17" />
    <polygon points="-7,-10 0,-13 7,-10 0,-7" />
    <polygon points="0,-25 4,-17 -4,-17" />
  </template>
  <template v-else>
    <polygon points="-8,0 0,-4 8,0 0,4" />
    <polyline points="0,0 3,-11" />
    <polyline points="-2,-11 3,-15 8,-11" fill="none" />
  </template>
</template>
