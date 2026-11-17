<script setup lang="ts">
/** Une liste de parties : les deux joueurs, le résultat, et le lien vers la partie. */
import { computed } from "vue";
import type { AdminMatchSummary } from "@occulis/protocol";
import { IconButton, Table, useMessages } from "@occulis/ui";
import { formatDate, routeHash } from "../model.js";
import ResultBadge from "./ResultBadge.vue";

const props = defineProps<{
  matches: readonly AdminMatchSummary[];
  /** Sans les colonnes de date et de coups : pour une carte étroite. */
  compact?: boolean | undefined;
}>();

const messages = useMessages();
const text = computed(() => messages.value.admin.matchTable);
const columns = computed(() => {
  const c = text.value.columns;
  return props.compact ? [c.match, c.result, ""] : [c.start, c.match, c.result, c.moves, ""];
});

function open(match: AdminMatchSummary) {
  location.hash = routeHash({ view: "match", id: match.id });
}
</script>

<template>
  <Table :columns="columns" :row-count="matches.length" :empty="text.empty">
    <tr v-for="match in matches" :key="match.id">
      <td v-if="!compact" class="occ-muted">{{ formatDate(match.startedAt) }}</td>
      <td>
        <a :href="routeHash({ view: 'player', id: match.playerA.id })">{{
          match.playerA.handle
        }}</a>
        <span class="occ-muted">{{ text.against }}</span>
        <a :href="routeHash({ view: 'player', id: match.playerB.id })">{{
          match.playerB.handle
        }}</a>
        <small v-if="compact" class="occ-muted" style="display: block">
          {{ formatDate(match.startedAt) }}
        </small>
      </td>
      <td><ResultBadge :match="match" /></td>
      <td v-if="!compact" class="occ-muted">{{ match.actions }}</td>
      <td class="occ-actions-cell">
        <IconButton icon="eye" :label="text.view" tip-align="end" @click="open(match)" />
      </td>
    </tr>
  </Table>
</template>
