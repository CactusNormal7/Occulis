<script setup lang="ts">
/** L'inversion qui part du clic et couvre le cadre en cercle. */
import { shallowRef } from "vue";
import { Badge } from "../../src/index.js";
import { PaperInversion, type PaperRun } from "../../src/lab/index.js";

defineProps<{ blend: "cover" | "invert" }>();

const run = shallowRef<PaperRun | null>(null);

function start(event: MouseEvent) {
  const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
  run.value = {
    key: Date.now(),
    source: { kind: "point", x: event.clientX - box.left, y: event.clientY - box.top },
  };
}
</script>

<template>
  <div class="occ-lab-screen occ-lab-screen--clickable" @click="start">
    <div class="occ-lab-screen__content">
      <span class="occ-lab-display">Click anywhere</span>
      <div class="occ-lab-row">
        <Badge tone="A">Camp A</Badge>
        <Badge tone="B">Camp B</Badge>
        <Badge tone="strong">Ink</Badge>
      </div>
      <span class="occ-lab-note"
        >The wave starts under the pointer and covers the frame, then resorbs.</span
      >
    </div>
    <PaperInversion :run="run" :blend="blend" />
  </div>
</template>
