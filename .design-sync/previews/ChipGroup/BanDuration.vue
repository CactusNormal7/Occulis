<script setup lang="ts">
import { ref } from "vue";
import { ChipGroup } from "@occulis/ui";

const days = ref<string | undefined>("7");
const options = [
  { value: "1", label: "1 jour" },
  { value: "7", label: "7 jours" },
  { value: "30", label: "30 jours" },
  { value: "", label: "définitive" },
];
</script>

<template>
  <ChipGroup v-model="days" :options="options" />
</template>
