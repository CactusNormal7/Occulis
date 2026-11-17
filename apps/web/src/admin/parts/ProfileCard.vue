<script setup lang="ts">
/** Le bilan de jeu d'un joueur, en chiffres. */
import { computed } from "vue";
import type { AdminPlayer } from "@occulis/protocol";
import { Card, Stat, StatGrid, useMessages } from "@occulis/ui";
import { winRate } from "../model.js";

const props = defineProps<{ player: AdminPlayer }>();

const messages = useMessages();
const text = computed(() => messages.value.admin.profileCard);
const rate = computed(() => {
  const value = winRate(props.player.record);
  return value === null ? "—" : `${value} %`;
});
</script>

<template>
  <Card :title="messages.admin.user.gameProfile">
    <StatGrid>
      <Stat :value="player.record.played" :label="text.played" />
      <Stat :value="player.record.won" :label="text.won" />
      <Stat :value="player.record.lost" :label="text.lost" />
      <Stat :value="player.record.ongoing" :label="text.ongoing" />
      <Stat :value="rate" :label="text.rate" />
      <Stat :value="player.elo" :label="text.elo" />
    </StatGrid>
  </Card>
</template>
