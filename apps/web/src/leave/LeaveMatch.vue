<script setup lang="ts">
/**
 * Quitter une partie vivante, c'est l'abandonner : aucun chemin ne ramène à un siège
 * quitté. La question passe donc par une fenêtre de la charte, en teinte de refus, et non
 * par `confirm()`.
 */
import { computed } from "vue";
import { Dialog, Note, useMessages } from "@occulis/ui";

const emit = defineEmits<{ confirm: []; cancel: [] }>();

const messages = useMessages();
const text = computed(() => messages.value.game.console);

function confirm() {
  emit("confirm");
  return true;
}
</script>

<template>
  <Dialog
    open
    danger
    :title="text.leaveTitle"
    :confirm-label="text.leaveAction"
    @confirm="confirm"
    @close="emit('cancel')"
  >
    <Note>{{ text.leaveConfirm }}</Note>
  </Dialog>
</template>
