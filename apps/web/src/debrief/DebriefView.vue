<script setup lang="ts">
/**
 * L'écran de fin d'une partie jouée : le résultat, l'Elo des deux joueurs et ce qu'il a
 * bougé, quelques chiffres de la partie et son replay — la partie est finie, les deux
 * camps sont révélés. Ce qui n'est pas encore calculé (temps de réflexion, faits d'armes
 * de la partie) est montré **factice**, sous le ruban de chantier.
 */
import { computed } from "vue";
import type { MeMatchDebrief } from "@occulis/protocol";
import {
  Button,
  Card,
  CardColumn,
  CardGrid,
  EmptyState,
  FactStrip,
  Hero,
  Stat,
  StatGrid,
  Table,
  WorkInProgress,
  useMessages,
  type Fact,
} from "@occulis/ui";
import { formatDate } from "../admin/model.js";
import { useLoad } from "../load/use-load.js";
import MatchReplay from "../profile/parts/MatchReplay.vue";
import MyResult from "../profile/parts/MyResult.vue";
import * as api from "./api.js";
import DebriefPlayers from "./DebriefPlayers.vue";
import MatchFeats from "./MatchFeats.vue";
import { PLACEHOLDER, debriefReason, debriefStats, formatDuration } from "./model.js";

const props = defineProps<{ matchId: string }>();

const emit = defineEmits<{ playAgain: []; menu: [] }>();

const messages = useMessages();
const text = computed(() => messages.value.game.debrief);

const { loaded } = await useLoad(() => api.debrief(props.matchId));

const match = computed<MeMatchDebrief | undefined>(() =>
  loaded.value.state === "ready" ? loaded.value.value : undefined,
);
const stats = computed(() => (match.value === undefined ? undefined : debriefStats(match.value)));

const title = computed(() => {
  if (match.value?.result === "drawn") return text.value.draw;
  return match.value?.result === "won" ? text.value.victory : text.value.defeat;
});

const reason = computed(() => {
  if (match.value === undefined || stats.value === undefined) return "";
  return debriefReason(
    text.value,
    match.value.outcome,
    match.value.result === "won",
    stats.value.endedOn,
  );
});

const facts = computed<Fact[]>(() => {
  if (match.value === undefined || stats.value === undefined) return [];
  const labels = text.value.facts;
  const { durationMs } = stats.value;
  return [
    { label: labels.duration, value: durationMs === null ? "—" : formatDuration(durationMs) },
    { label: labels.moves, value: match.value.log.length },
    { label: labels.map, value: match.value.scenario },
    { label: labels.rules, value: match.value.rulesetVersion },
    { label: labels.finished, value: formatDate(match.value.finishedAt) },
  ];
});

/** Les lignes du tableau des chiffres : un libellé, sa valeur chez soi et chez l'adversaire. */
const statRows = computed(() => {
  if (stats.value === undefined) return [];
  const { self, opponent } = stats.value;
  const labels = text.value.stats;
  return [
    { label: labels.moves, self: self.moves, opponent: opponent.moves },
    { label: labels.pieces, self: self.pieces, opponent: opponent.pieces },
    { label: labels.seen, self: self.seen, opponent: opponent.seen },
  ];
});
</script>

<template>
  <EmptyState v-if="loaded.state === 'failed'" error>
    {{ loaded.message }}
    <template #action>
      <Button @click="emit('menu')">{{ text.menu }}</Button>
    </template>
  </EmptyState>

  <template v-else-if="match !== undefined">
    <Hero :title="title">
      <template #badges>
        <MyResult :match="match" />
      </template>
      <template #meta>
        <span>{{ reason }}</span>
        <span>{{ formatDate(match.finishedAt) }}</span>
      </template>
      <template #actions>
        <Button variant="ghost" @click="emit('menu')">{{ text.menu }}</Button>
        <Button variant="primary" @click="emit('playAgain')">{{ text.playAgain }}</Button>
      </template>
    </Hero>

    <DebriefPlayers :match="match" />
    <FactStrip :facts="facts" />

    <CardGrid>
      <CardColumn>
        <Card :title="text.stats.title">
          <Table
            :columns="['', text.stats.you, text.stats.them]"
            :centered="[1, 2]"
            :row-count="statRows.length"
          >
            <tr v-for="row in statRows" :key="row.label">
              <td class="occ-muted">{{ row.label }}</td>
              <td class="occ-center">{{ row.self }}</td>
              <td class="occ-center">{{ row.opponent }}</td>
            </tr>
          </Table>
        </Card>
        <WorkInProgress :note="text.stats.placeholder">
          <Card>
            <StatGrid>
              <Stat
                :value="formatDuration(PLACEHOLDER.thinkingMs.average)"
                :label="text.stats.thinking"
              />
              <Stat
                :value="formatDuration(PLACEHOLDER.thinkingMs.longest)"
                :label="text.stats.longest"
              />
            </StatGrid>
          </Card>
        </WorkInProgress>
      </CardColumn>
      <CardColumn>
        <MatchFeats />
      </CardColumn>
    </CardGrid>

    <MatchReplay :match="match" />
  </template>
</template>
