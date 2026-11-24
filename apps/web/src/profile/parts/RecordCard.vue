<script setup lang="ts">
/** Le bilan de jeu, en chiffres : le sien ou celui d'un ami. L'emplacement `action` prend un lien. */
import { computed } from "vue";
import type { MeRecord } from "@occulis/protocol";
import { Card, Stat, StatGrid, useMessages } from "@occulis/ui";
import { winRate } from "../../admin/model.js";

const props = defineProps<{
  record: MeRecord;
  elo: number;
}>();

const messages = useMessages();
const text = computed(() => messages.value.profile.record);
const rate = computed(() => {
  const value = winRate(props.record);
  return value === null ? "—" : `${value} %`;
});
</script>

<template>
  <Card :title="text.title">
    <template v-if="$slots.action !== undefined" #action>
      <slot name="action" />
    </template>
    <StatGrid>
      <Stat :value="record.played" :label="text.played" />
      <Stat :value="record.won" :label="text.won" />
      <Stat :value="record.lost" :label="text.lost" />
      <Stat :value="record.ongoing" :label="text.ongoing" />
      <Stat :value="rate" :label="text.rate" />
      <Stat :value="elo" :label="text.elo" />
    </StatGrid>
  </Card>
</template>
