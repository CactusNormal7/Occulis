<script setup lang="ts">
/**
 * Une icône au trait, en `currentColor`. Décorative : son libellé est porté par le bouton
 * qui la contient.
 */
import { computed } from "vue";
import { ICONS, type IconName, type IconShape } from "../icons.js";

const props = withDefaults(
  defineProps<{
    /** Le nom de l'icône, parmi `ICON_NAMES`. */
    name: IconName;
    /** Côté en pixels. 16 par défaut, la taille des boutons à icône. */
    size?: number | undefined;
  }>(),
  { size: 16 },
);

const shapes = computed<readonly IconShape[]>(() => ICONS[props.name]);
</script>

<template>
  <svg viewBox="0 0 24 24" :width="size" :height="size" aria-hidden="true" class="occ-icon">
    <template v-for="(shape, index) in shapes" :key="index">
      <path v-if="'d' in shape" :d="shape.d" />
      <circle v-else :cx="shape.circle[0]" :cy="shape.circle[1]" :r="shape.circle[2]" />
    </template>
  </svg>
</template>
