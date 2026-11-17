<script setup lang="ts">
/** Un aperçu qui lève une erreur ne doit pas emporter la page : il est remplacé par son message. */
import { onErrorCaptured, ref } from "vue";
import { EmptyState } from "@occulis/ui";

const error = ref<string | null>(null);

onErrorCaptured((caught) => {
  error.value = caught instanceof Error ? caught.message : String(caught);
  // L'erreur s'arrête ici : la page autour continue.
  return false;
});
</script>

<template>
  <EmptyState v-if="error !== null">{{ error }}</EmptyState>
  <slot v-else />
</template>
