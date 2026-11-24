<script setup lang="ts">
import { HUD_ICONS, type HudIconName } from "./icons.js";

/** Une icône de l'ATH en pixels pleins ; décorative, le bouton porte le libellé. */
defineProps<{ name: HudIconName }>();
</script>

<template>
  <svg class="hud-icon" viewBox="0 0 8 8" aria-hidden="true">
    <path :d="HUD_ICONS[name]" fill="currentColor" fill-rule="evenodd" />
  </svg>
</template>
