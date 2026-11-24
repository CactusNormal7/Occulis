<script setup lang="ts">
/**
 * Les bandeaux sous le tour : l'échec du joueur, le départ de l'adversaire avec le temps
 * avant son forfait, et le message bref d'un coup refusé ou d'une connexion qui se reprend.
 */
import { computed } from "vue";
import { useMessages } from "@occulis/ui";
import type { MatchNotice, OpponentAway } from "../app/match-controller.js";
import { useRemaining } from "../prepare/clock.js";
import { secondsLeft } from "../prepare/model.js";

const props = defineProps<{
  check: boolean;
  away: OpponentAway | undefined;
  /** Le nom de l'adversaire, pour dire qui est parti. */
  opponentName: string;
  notice: MatchNotice | undefined;
}>();

const messages = useMessages();
const t = computed(() => messages.value.game.hud);
const remaining = useRemaining(
  () => props.away?.forfeitInMs ?? 0,
  () => props.away?.receivedAt ?? 0,
);
</script>

<template>
  <div class="hud-alerts">
    <p v-if="check" class="hud-alert hud-panel hud-panel--threat hud-caps" role="alert">
      {{ t.checkAlert }}
    </p>
    <div v-if="away !== undefined" class="hud-alert hud-panel hud-panel--caution" role="status">
      <p class="hud-caps hud-caution">{{ t.away(opponentName) }}</p>
      <p class="hud-soft">{{ t.forfeitIn(secondsLeft(remaining)) }}</p>
    </div>
    <p
      v-if="notice !== undefined"
      :key="notice.text"
      class="hud-notice hud-panel"
      :data-tone="notice.tone"
      role="status"
    >
      {{ notice.text }}
    </p>
  </div>
</template>
