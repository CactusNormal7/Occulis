<script setup lang="ts">
/**
 * L'insigne d'un joueur : ses initiales dans une case du plateau, un losange 2:1 aux
 * proportions des cases du jeu. Il remplace l'avatar rond, qui n'existe nulle part
 * ailleurs dans Occulis.
 */
import { initials } from "../initials.js";
import type { Camp } from "../types.js";

withDefaults(
  defineProps<{
    /** Le nom dont on tire les initiales. */
    name: string;
    size?: "sm" | "lg" | undefined;
    /** Teinte la case à la couleur d'un camp, quand elle désigne un siège de partie. */
    camp?: Camp | undefined;
  }>(),
  { size: "sm" },
);
</script>

<template>
  <svg
    viewBox="0 0 72 36"
    aria-hidden="true"
    :class="[
      'occ-tile-avatar',
      `occ-tile-avatar--${size}`,
      camp !== undefined && `occ-tile-avatar--${camp}`,
    ]"
  >
    <polygon points="36,1 71,18 36,35 1,18" />
    <text x="36" y="19">{{ initials(name) }}</text>
  </svg>
</template>
