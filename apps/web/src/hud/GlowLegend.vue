<script setup lang="ts">
/** Ce que disent les lueurs du plateau, en bas de l'écran, tant qu'une pièce est choisie. */
import { computed } from "vue";
import { useMessages } from "@occulis/ui";

const messages = useMessages();
const t = computed(() => messages.value.game.hud.legend);
</script>

<template>
  <p class="hud-legend" :aria-label="t.label">
    <span class="hud-legend__selection"><i />{{ t.selection }}</span>
    <span class="hud-legal"><i />{{ t.move }}</span>
    <span class="hud-threat"><i />{{ t.capture }}</span>
  </p>
</template>
