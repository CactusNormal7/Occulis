<script setup lang="ts">
/** Les deux joueurs face à face, chacun dans son camp, avec ce que la partie a fait de son Elo. */
import { computed } from "vue";
import type { MeMatchDebrief } from "@occulis/protocol";
import { Badge, PlayerPlate, Reveal, useMessages } from "@occulis/ui";
import { eloBefore } from "./model.js";

const props = defineProps<{ match: MeMatchDebrief }>();

const messages = useMessages();
const text = computed(() => messages.value.game.debrief);
const opponent = computed(() => (props.match.seat === "A" ? "B" : "A"));

function eloLine(current: number, delta: number | null): string {
  if (delta === null) return text.value.elo(current);
  const change = messages.value.profile.matches.ratingChange(delta);
  return text.value.eloChange(eloBefore(current, delta), current, change);
}
</script>

<template>
  <Reveal :versus="messages.ui.versus.against">
    <template #self>
      <PlayerPlate
        :name="text.you"
        :camp="match.seat"
        :tag="messages.ui.versus.seat(match.seat)"
        :lines="[eloLine(match.elo, match.ratingChange)]"
      />
    </template>
    <template #opponent>
      <PlayerPlate
        :name="match.opponent"
        :camp="opponent"
        :tag="text.opponent"
        align="end"
        :lines="[eloLine(match.opponentElo, match.opponentRatingChange)]"
      />
    </template>
    <template #footer>
      <Badge tone="strong">{{ match.rated ? text.rated : text.unrated }}</Badge>
    </template>
  </Reveal>
</template>
