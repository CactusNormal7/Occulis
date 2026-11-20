<script setup lang="ts">
import { ref } from "vue";
import { Segmented } from "@occulis/ui";

const filter = ref("ongoing");
const options = [
  { value: "all", label: "toutes" },
  { value: "ongoing", label: "en cours" },
  { value: "finished", label: "terminées" },
];
</script>

<template>
  <Segmented v-model="filter" label="Filtrer les parties" :options="options" />
</template>
