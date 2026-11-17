<script setup lang="ts">
/** Le choix de langue : chaque langue écrite dans sa propre langue. */
import { LOCALES, type Locale } from "@occulis/i18n";
import { useMessages } from "../composables/locale.js";
import Segmented from "./Segmented.vue";

const locale = defineModel<Locale>({ required: true });
const messages = useMessages();

const options = LOCALES.map((value) => ({ value, label: value.toUpperCase() }));
</script>

<template>
  <Segmented v-model="locale" :label="messages.ui.language" :options="options" />
</template>
