<script setup lang="ts">
/** La fiche d'une partie : ses joueurs, ses faits, et son rejeu coup par coup. */
import { computed } from "vue";
import type { AdminMatchDetail } from "@occulis/protocol";
import { BackLink, Banner, FactStrip, Versus, useMessages, type Fact } from "@occulis/ui";
import Ready from "../../load/Ready.vue";
import { useLoad } from "../../load/use-load.js";
import { MATCHES_ROUTE, formatDate, routeHash } from "../model.js";
import MatchReplay from "../parts/MatchReplay.vue";
import ResultBadge from "../parts/ResultBadge.vue";
import * as R from "../resources.js";

const props = defineProps<{ id: string }>();

const messages = useMessages();
const text = computed(() => messages.value.admin.match);

const { loaded } = await useLoad(() => R.match(props.id));

function sideOf(player: { id: string; handle: string }) {
  return { name: player.handle, href: routeHash({ view: "player", id: player.id }) };
}

function factsOf(match: AdminMatchDetail): Fact[] {
  const labels = text.value.facts;
  return [
    { label: labels.start, value: formatDate(match.startedAt) },
    { label: labels.end, value: formatDate(match.finishedAt) },
    { label: labels.rules, value: match.rulesetVersion },
    { label: labels.map, value: match.scenario },
    { label: labels.moves, value: match.log.length },
    { label: labels.id, value: match.id, code: true },
  ];
}
</script>

<template>
  <Ready v-slot="{ value: match }" :loaded="loaded">
    <BackLink :href="routeHash(MATCHES_ROUTE)">{{ text.back }}</BackLink>
    <Versus :a="sideOf(match.playerA)" :b="sideOf(match.playerB)">
      <template #end>
        <ResultBadge :match="match" />
      </template>
    </Versus>
    <FactStrip :facts="factsOf(match)" />
    <Banner v-if="match.replayError !== null">
      {{ text.replayError(match.replayError.seq, match.replayError.code) }}
    </Banner>
    <MatchReplay :match="match" />
  </Ready>
</template>
