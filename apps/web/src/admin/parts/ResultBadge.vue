<script setup lang="ts">
/** Le résultat dans la couleur du camp vainqueur : c'est une information de partie. */
import { computed } from "vue";
import { winnerOf } from "@occulis/core";
import type { AdminMatchSummary } from "@occulis/protocol";
import { Badge, useMessages } from "@occulis/ui";
import { describeResult } from "../model.js";

const props = defineProps<{ match: AdminMatchSummary }>();

const messages = useMessages();
const winner = computed(() =>
  props.match.outcome === null ? undefined : (winnerOf(props.match.outcome) ?? "plain"),
);
</script>

<template>
  <Badge v-if="winner === undefined" tone="dim">{{ messages.admin.result.ongoing }}</Badge>
  <Badge v-else :tone="winner">{{ describeResult(match) }}</Badge>
</template>
