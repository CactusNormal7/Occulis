<script setup lang="ts">
/**
 * Le replay d'une partie finie — la sienne ou celle d'un ami : son en-tête, ses faits, et le
 * plateau rejoué. Le replay révèle les deux camps : la partie est finie.
 */
import { computed } from "vue";
import type { MeMatchDetail } from "@occulis/protocol";
import { BackLink, Banner, FactStrip, Hero, useMessages, type Fact } from "@occulis/ui";
import { formatDate } from "../../admin/model.js";
import MatchReplay from "./MatchReplay.vue";
import MyResult from "./MyResult.vue";

const props = defineProps<{
  match: MeMatchDetail;
  back: { href: string; label: string };
  /** Le pseudo de l'ami dont c'est le camp ; absent, c'est le sien. */
  friend?: string | undefined;
}>();

const messages = useMessages();
const text = computed(() => messages.value.profile.matches);

const title = computed(() =>
  props.friend === undefined
    ? text.value.against(props.match.opponent)
    : messages.value.social.friend.against(props.friend, props.match.opponent),
);

const facts = computed<Fact[]>(() => {
  const labels = text.value.facts;
  return [
    { label: labels.start, value: formatDate(props.match.startedAt) },
    { label: labels.end, value: formatDate(props.match.finishedAt) },
    { label: labels.rules, value: props.match.rulesetVersion },
    { label: labels.map, value: props.match.scenario },
    { label: labels.moves, value: props.match.log.length },
  ];
});
</script>

<template>
  <BackLink :href="back.href">{{ back.label }}</BackLink>
  <Hero :title="title">
    <template #badges>
      <MyResult :match="match" />
    </template>
    <template #meta>
      <span>{{ text.side(match.seat) }}</span>
      <span>{{ formatDate(match.startedAt) }}</span>
    </template>
  </Hero>
  <FactStrip :facts="facts" />
  <Banner v-if="match.replayError !== null">
    {{ text.replayError(match.replayError.seq, match.replayError.code) }}
  </Banner>
  <MatchReplay :match="match" :friend="friend" />
</template>
