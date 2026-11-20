<script setup lang="ts">
/**
 * La composition d'un camp : une icône par pièce de départ, les pièces prises éteintes et
 * barrées. Des types seulement — jamais une position (`PlayerView.rosters`).
 */
import type { PlayerId } from "@occulis/core";
import type { RosterSlot } from "./model.js";
import PieceGlyph from "./PieceGlyph.vue";

defineProps<{ slots: readonly RosterSlot[]; camp: PlayerId; label: string }>();
</script>

<template>
  <ol class="hud-roster" :aria-label="label">
    <li
      v-for="(slot, index) in slots"
      :key="index"
      class="hud-roster__slot"
      :data-taken="slot.taken ? '' : undefined"
    >
      <PieceGlyph :kind="slot.kind" :camp="camp" :taken="slot.taken" />
      <span class="hud-visually-hidden">{{ slot.label }}</span>
    </li>
  </ol>
</template>
