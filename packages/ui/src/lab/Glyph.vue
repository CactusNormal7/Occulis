<script setup lang="ts">
/**
 * Un glyphe au trait d'un pixel. Le trait est la couleur du texte (`currentColor`) : un
 * glyphe ne porte aucune couleur propre. Toujours décoratif — c'est à son parent de dire
 * ce qu'il signifie.
 */
import { GLYPH_HEIGHT, GLYPH_WIDTH, type GlyphShape } from "./glyphs.js";

defineProps<{ glyph: GlyphShape }>();

const VIEW_BOX = `-0.5 -0.5 ${GLYPH_WIDTH + 1} ${GLYPH_HEIGHT + 1}`;

/**
 * L'anneau est cranté comme les cadres de la charte : un carré de cinq pas aux coins coupés,
 * la façon dont le pixel art trace un cercle.
 */
function ringPoints(x: number, y: number): string {
  return [
    [x - 1, y - 2],
    [x + 1, y - 2],
    [x + 2, y - 1],
    [x + 2, y + 1],
    [x + 1, y + 2],
    [x - 1, y + 2],
    [x - 2, y + 1],
    [x - 2, y - 1],
  ]
    .map(([px, py]) => `${px},${py}`)
    .join(" ");
}
</script>

<template>
  <svg class="occ-glyph" :viewBox="VIEW_BOX" aria-hidden="true" focusable="false">
    <line
      v-for="([x1, y1, x2, y2], index) in glyph.segments"
      :key="`s${index}`"
      :x1="x1"
      :y1="y1"
      :x2="x2"
      :y2="y2"
    />
    <polygon v-for="([x, y], index) in glyph.rings" :key="`r${index}`" :points="ringPoints(x, y)" />
    <rect
      v-for="([x, y], index) in glyph.dots"
      :key="`d${index}`"
      class="occ-glyph__dot"
      :x="x - 0.5"
      :y="y - 0.5"
      width="1.5"
      height="1.5"
    />
  </svg>
</template>
