<script setup lang="ts">
import { ref } from "vue";
import type { Locale } from "@occulis/i18n";
import { LocaleSwitch } from "@occulis/ui";

const locale = ref<Locale>("en");
</script>

<template>
  <LocaleSwitch v-model="locale" />
</template>
