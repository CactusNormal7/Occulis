<script setup lang="ts">
/** Le résultat d'une partie, vu de son camp, dans la couleur du camp vainqueur. */
import { computed } from "vue";
import type { MeMatchSummary } from "@occulis/protocol";
import { Badge, useMessages } from "@occulis/ui";
import { describeMyResult } from "../model.js";

const props = defineProps<{ match: Pick<MeMatchSummary, "result" | "outcome" | "seat"> }>();

const messages = useMessages();
// La couleur du camp vainqueur : c'est une information de partie.
const winner = computed(() =>
  props.match.outcome?.kind === "victory" ? props.match.outcome.winner : undefined,
);
</script>

<template>
  <Badge v-if="match.result === 'ongoing'" tone="dim">{{ messages.profile.results.ongoing }}</Badge>
  <Badge v-else :tone="winner ?? 'plain'">{{ describeMyResult(match) }}</Badge>
</template>
