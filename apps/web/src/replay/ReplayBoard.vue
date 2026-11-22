<script setup lang="ts">
/**
 * Le plateau rejoué, en Vue autour du canevas impératif de `replay-canvas.ts` : le dessin et
 * ses animations restent hors du cycle de rendu, Vue ne lui transmet que l'image, le point de
 * vue et les quarts de tour.
 */
import { onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from "vue";
import type { Board } from "@occulis/core";
import type { AdminFrame, AdminLogEntry } from "@occulis/protocol";
import { useMessages } from "@occulis/ui";
import { mountReplay, type ReplayCanvas } from "./replay-canvas.js";
import type { Perspective } from "./replay.js";

const props = defineProps<{
  board: Board;
  frames: readonly AdminFrame[];
  /** Le log rejoué : il dit où allait une pièce happée par un piège. */
  log: readonly AdminLogEntry[];
  /** L'image montrée ; un changement fait glisser les pièces. */
  index: number;
  perspective: Perspective;
  /** Le nombre de quarts de tour demandés, signé : chaque pas fait tourner le plateau. */
  turns: number;
}>();

const messages = useMessages();
const canvas = useTemplateRef<HTMLCanvasElement>("canvas");
const replay = shallowRef<ReplayCanvas | null>(null);
/** Les quarts de tour déjà appliqués au canevas. */
let turned = 0;

function mount() {
  replay.value?.destroy();
  replay.value =
    canvas.value === null ? null : mountReplay(canvas.value, props.board, props.frames, props.log);
  turned = 0;
}

onMounted(mount);
watch(() => [props.board, props.frames, props.log], mount);
onBeforeUnmount(() => replay.value?.destroy());

watch(
  () => props.index,
  (index) => replay.value?.show(index, true),
);
watch(
  () => props.perspective,
  (perspective) => replay.value?.setPerspective(perspective),
);
watch(
  () => props.turns,
  (turns) => {
    // Un pas à la fois : chaque quart de tour s'anime.
    while (turned < turns) {
      replay.value?.rotate(1);
      turned += 1;
    }
    while (turned > turns) {
      replay.value?.rotate(-1);
      turned -= 1;
    }
  },
);
</script>

<template>
  <canvas
    ref="canvas"
    :aria-label="messages.admin.match.board"
    style="display: block; width: 100%; height: clamp(320px, 58vh, 560px)"
  />
</template>
