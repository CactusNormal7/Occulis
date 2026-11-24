<script setup lang="ts">
/** La plaque d'un joueur, depuis sa carte : Elo, bilan, et ses faits d'armes par leur nom. */
import { computed } from "vue";
import type { PlayerId } from "@occulis/core";
import type { PlayerCard } from "@occulis/protocol";
import { Badge, PlayerPlate, useMessages } from "@occulis/ui";

const props = defineProps<{
  card: PlayerCard;
  camp: PlayerId;
  self: boolean;
  align: "start" | "end";
}>();

const messages = useMessages();
const text = computed(() => messages.value.prepare.reveal);
const lines = computed(() => [
  text.value.elo(props.card.elo),
  props.card.played === 0
    ? text.value.newcomer
    : text.value.record(props.card.played, props.card.won),
]);
</script>

<template>
  <PlayerPlate
    :name="card.handle"
    :camp="camp"
    :align="align"
    :tag="self ? text.you : undefined"
    :lines="lines"
  >
    <template v-if="card.feats.length > 0" #badges>
      <Badge v-for="id in card.feats" :key="id">{{ messages.feats.names[id] ?? id }}</Badge>
    </template>
  </PlayerPlate>
</template>
