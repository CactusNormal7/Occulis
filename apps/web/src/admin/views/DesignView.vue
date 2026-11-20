<script setup lang="ts">
/** Le design system, une fois sa page arrivée (`designSystem`, chargée à part). */
import Ready from "../../load/Ready.vue";
import { useLoad } from "../../load/use-load.js";
import type { Route } from "../model.js";
import { designSystem } from "../resources.js";

defineProps<{ route: Extract<Route, { view: "design" }> }>();

const { loaded } = await useLoad(() => designSystem);
</script>

<template>
  <Ready v-slot="{ value: DesignSystem }" :loaded="loaded">
    <component :is="DesignSystem" :route="route" />
  </Ready>
</template>
