<script setup lang="ts">
/**
 * La fin d'une partie regardée, chez le spectateur — les joueurs, eux, passent à l'écran
 * de fin (`debrief/`). Le geste attendu est le retour au menu ; l'écarter laisse revoir le
 * plateau final, d'où « Quitter la partie » ramène aussi au menu.
 */
import { computed } from "vue";
import { Dialog, Note, useMessages } from "@occulis/ui";
import type { MatchEnd } from "../app/match-controller.js";
import { endTexts } from "./model.js";

const props = defineProps<{ end: MatchEnd }>();

const emit = defineEmits<{ menu: []; board: [] }>();

const messages = useMessages();
const text = computed(() => messages.value.game.end);
const texts = computed(() => endTexts(text.value, props.end));

function goToMenu() {
  emit("menu");
  return true;
}
</script>

<template>
  <Dialog
    open
    :title="texts.title"
    :confirm-label="text.menu"
    :cancel-label="text.board"
    @confirm="goToMenu"
    @close="emit('board')"
  >
    <Note>{{ texts.detail }}</Note>
  </Dialog>
</template>
