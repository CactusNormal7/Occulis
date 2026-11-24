<script setup lang="ts">
import { MoveList, type MoveEntry } from "@occulis/ui";

/** Le rejeu s'est arrêté au coup 4 : les suivants ne se montrent pas. */
const entries: MoveEntry[] = [
  { number: "—", text: "départ" },
  { number: "1", seat: "A", text: "0,7 → 3,7" },
  { number: "2", seat: "B", text: "9,0 → 9,3" },
  { number: "3", seat: "A", text: "3,7 → 6,7" },
  { number: "4", seat: "B", text: "9,3 → 9,6", disabled: true },
];
</script>

<template>
  <MoveList :entries="entries" :pinned="3" />
</template>
