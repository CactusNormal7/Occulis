<script setup lang="ts">
/** Un mur : ses deux faces visibles et son dessus, relevé de `WALL_HEIGHT`. */
import { computed } from "vue";
import { project, type Tile } from "../../src/lab/index.js";
import { ISO, WALL_HEIGHT, top } from "./iso.js";

const props = defineProps<{ tile: Tile }>();

const faces = computed(() => {
  const { x, y } = project(props.tile, ISO);
  const w = ISO.tileWidth / 2;
  const h = ISO.tileHeight / 2;
  const z = WALL_HEIGHT;
  return {
    left: `${x - w},${y - z} ${x},${y + h - z} ${x},${y + h} ${x - w},${y}`,
    right: `${x},${y + h - z} ${x + w},${y - z} ${x + w},${y} ${x},${y + h}`,
    top: top(props.tile, z),
  };
});
</script>

<template>
  <g>
    <polygon class="occ-lab-wall__left" :points="faces.left" />
    <polygon class="occ-lab-wall__right" :points="faces.right" />
    <polygon class="occ-lab-wall__top" :points="faces.top" />
  </g>
</template>
