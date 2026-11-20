<script setup lang="ts">
import { ref } from "vue";
import { MoveList, type MoveEntry } from "@occulis/ui";

const entries: MoveEntry[] = [
  { number: "—", text: "départ" },
  { number: "1", seat: "A", text: "0,7 → 3,7" },
  { number: "2", seat: "B", text: "9,0 → 9,3" },
  { number: "3", seat: "A", text: "3,7 → 6,7" },
  { number: "4", seat: "B", text: "9,3 → 9,6" },
  { number: "5", seat: "A", text: "6,7 → 7,7" },
  { number: "6", seat: "B", text: "abandon" },
];

/** L'entrée épinglée par un clic, et celle que montre le survol. */
const pinned = ref(3);
const shown = ref(3);
</script>

<template>
  <MoveList
    :entries="entries"
    :pinned="pinned"
    :shown="shown"
    @preview="shown = $event"
    @pick="pinned = $event"
    @leave="shown = pinned"
  />
</template>
