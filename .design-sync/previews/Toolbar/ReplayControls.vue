<script setup lang="ts">
import { ref } from "vue";
import { IconButton, QuickBar, Segmented, Toolbar, ToolbarText } from "@occulis/ui";

const view = ref("all");
const options = [
  { value: "all", label: "tout" },
  { value: "A", label: "vue d'anne", camp: "A" as const },
  { value: "B", label: "vue de bruno", camp: "B" as const },
];
</script>

<template>
  <Toolbar>
    <QuickBar>
      <IconButton icon="first" label="Position de départ" />
      <IconButton icon="previous" label="Coup précédent" />
      <IconButton icon="play" label="Lire la partie" />
      <IconButton icon="next" label="Coup suivant" />
      <IconButton icon="last" label="Dernière position" />
    </QuickBar>
    <ToolbarText>coup 3 / 11 — A · anne — 3,7 → 6,7</ToolbarText>
    <Segmented v-model="view" :options="options" />
  </Toolbar>
</template>
