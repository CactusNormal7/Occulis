<script setup lang="ts">
/**
 * Le glyphe d'une pièce en SVG, tiré de `@occulis/board/glyphs` : exactement la forme que
 * le plateau dessine, à la taille de l'ATH. Décoratif — le nom de la pièce est dit à côté.
 */
import { computed } from "vue";
import type { PieceKind, PlayerId } from "@occulis/core";
import { glyphOf, litPixels } from "@occulis/board/glyphs";

const props = defineProps<{
  kind: PieceKind;
  camp: PlayerId;
  /** Une pièce prise : éteinte. */
  taken?: boolean | undefined;
  /** Un fantôme : pâle, comme sur le plateau. */
  ghost?: boolean | undefined;
  /** La taille de la fiche de pièce, double de celle des compositions. */
  large?: boolean | undefined;
}>();

const glyph = computed(() => glyphOf(props.kind));
/** Un seul tracé, un carré par pixel allumé : pas de liseré entre deux voisins. */
const path = computed(() =>
  litPixels(glyph.value)
    .map((pixel) => `M${pixel.column} ${pixel.row}h1v1h-1z`)
    .join(""),
);
</script>

<template>
  <svg
    class="hud-glyph"
    :class="[`hud-camp-${camp}`, { 'hud-glyph--large': large }]"
    :viewBox="`0 0 ${glyph.width} ${glyph.height}`"
    :data-taken="taken ? '' : undefined"
    :data-ghost="ghost ? '' : undefined"
    aria-hidden="true"
  >
    <path :d="path" fill="currentColor" />
  </svg>
</template>
