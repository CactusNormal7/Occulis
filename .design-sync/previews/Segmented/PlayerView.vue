<script setup lang="ts">
import { ref } from "vue";
import { Segmented } from "@occulis/ui";

const view = ref("A");
/** Une option rattachée à un camp en prend la teinte. */
const options = [
  { value: "all", label: "tout" },
  { value: "A", label: "vue d'anne", camp: "A" as const },
  { value: "B", label: "vue de bruno", camp: "B" as const },
];
</script>

<template>
  <Segmented v-model="view" label="Point de vue" :options="options" />
</template>
