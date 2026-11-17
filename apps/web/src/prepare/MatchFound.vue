<script setup lang="ts">
/**
 * La fenêtre « partie trouvée » : accepter ou refuser, avant l'échéance. Elle ne se ferme
 * ni par Échap ni par la croix — la question attend une réponse explicite, et ne pas
 * répondre revient à refuser.
 */
import { computed, watchEffect } from "vue";
import { CountdownRing, Dialog, Note, useMessages } from "@occulis/ui";
import { useRemaining } from "./clock.js";
import { ACCEPT_TOTAL_MS } from "./constants.js";
import { secondsLeft } from "./model.js";

const props = defineProps<{
  remainingMs: number;
  /** L'instant d'arrivée du message, sur `performance.now()`. */
  receivedAt: number;
  accepted: { readonly self: boolean; readonly opponent: boolean };
}>();

const emit = defineEmits<{ accept: []; decline: [] }>();

const messages = useMessages();
const text = computed(() => messages.value.prepare);
const remaining = useRemaining(
  () => props.remainingMs,
  () => props.receivedAt,
);

const lead = computed(() => {
  const { self, opponent } = props.accepted;
  if (opponent) return text.value.found.opponentAccepted;
  return self ? text.value.found.waitingOpponent : text.value.found.lead;
});

// L'onglet en arrière-plan doit se signaler : on cherche une partie en faisant autre chose.
watchEffect((onCleanup) => {
  const tabTitle = text.value.found.tabTitle;
  const previous = document.title;
  let flipped = false;
  const timer = setInterval(() => {
    flipped = !flipped;
    document.title = flipped ? tabTitle : previous;
  }, 1000);
  onCleanup(() => {
    clearInterval(timer);
    document.title = previous;
  });
});

function accept() {
  emit("accept");
  // Reste ouverte : la partie ne part qu'avec l'accord de l'autre.
  return false;
}
</script>

<template>
  <Dialog
    open
    :dismissible="false"
    :title="text.found.title"
    :confirm-label="accepted.self ? text.found.accepted : text.found.accept"
    :cancel-label="text.found.decline"
    :ready="!accepted.self"
    @confirm="accept"
    @close="emit('decline')"
  >
    <CountdownRing
      size="lg"
      :total-ms="ACCEPT_TOTAL_MS"
      :remaining-ms="remaining"
      :label="text.remaining"
    >
      {{ secondsLeft(remaining) }}
    </CountdownRing>
    <Note>{{ lead }}</Note>
  </Dialog>
</template>
