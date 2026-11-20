<script setup lang="ts">
/** Une pièce seule, à la taille d'une légende. */
import type { Role } from "../board-mock.js";
import PieceShape from "./PieceShape.vue";

defineProps<{ role: Role; camp: "A" | "B" }>();
</script>

<template>
  <svg class="occ-lab-board" viewBox="-14 -34 28 42" width="56" height="84" aria-hidden="true">
    <g :class="`occ-lab-piece occ-lab-piece--${camp}`">
      <PieceShape :role="role" />
    </g>
  </svg>
</template>
