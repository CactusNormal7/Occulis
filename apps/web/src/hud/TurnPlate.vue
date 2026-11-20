<script setup lang="ts">
/** Le numéro du coup à jouer et qui doit le jouer, entre les deux plaques. */
import { computed } from "vue";
import { useMessages } from "@occulis/ui";
import type { TurnPlate } from "./model.js";

defineProps<{ turn: TurnPlate }>();

const messages = useMessages();
const t = computed(() => messages.value.game.hud);
</script>

<template>
  <section class="hud-turn hud-panel" aria-live="polite">
    <div class="hud-turn__number">
      <span class="hud-caps hud-dim">{{ t.turn }}</span>
      <span class="hud-turn__count">{{ turn.number }}</span>
    </div>
    <!-- La clé rejoue le tracé de la ligne à chaque changement : un trait neuf se lit comme neuf. -->
    <p :key="turn.line" class="hud-turn__line hud-caps" :data-tone="turn.tone">
      {{ turn.line }}
    </p>
  </section>
</template>
