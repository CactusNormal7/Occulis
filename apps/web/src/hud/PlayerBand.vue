<script setup lang="ts">
/**
 * La plaque d'un camp, en haut de l'écran : pseudo, Elo et composition. Le camp au trait
 * s'allume de sa couleur ; un adversaire parti se dit « hors ligne » à la place de son Elo.
 */
import { computed } from "vue";
import { useMessages } from "@occulis/ui";
import type { PlayerBand } from "./model.js";
import PieceRoster from "./PieceRoster.vue";

defineProps<{
  band: PlayerBand;
  /** `self` à gauche, `opponent` à droite, en miroir. */
  side: "self" | "opponent";
}>();

const messages = useMessages();
const t = computed(() => messages.value.game.hud);
</script>

<template>
  <section
    class="hud-band hud-panel"
    :class="[`hud-band--${side}`, `hud-camp-${band.camp}`, { 'hud-band--to-move': band.toMove }]"
  >
    <div class="hud-band__who">
      <span class="hud-band__name hud-caps"><span class="hud-pip" />{{ band.name }}</span>
      <span v-if="band.offline" class="hud-caps hud-caution">{{ t.offline }}</span>
      <span v-else-if="band.elo !== undefined" class="hud-dim">{{ band.elo }}</span>
    </div>
    <PieceRoster :slots="band.roster" :camp="band.camp" :label="band.rosterLabel" />
  </section>
</template>
