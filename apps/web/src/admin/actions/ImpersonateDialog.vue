<script setup lang="ts">
/** L'incarnation d'un joueur : la session devient la sienne, et le jeu s'ouvre. */
import { computed } from "vue";
import { Dialog, Note, useMessages, useToast } from "@occulis/ui";
import * as api from "../api.js";
import type { QuickUser } from "./act.js";

const props = defineProps<{ user: QuickUser }>();

const emit = defineEmits<{ close: [] }>();

const messages = useMessages();
const text = computed(() => messages.value.admin.actions);
const notify = useToast();

async function confirm() {
  const outcome = await api.impersonate(props.user.id);
  if (!outcome.ok) {
    notify(outcome.message, false);
    return false;
  }
  location.assign("/");
  return true;
}
</script>

<template>
  <Dialog
    open
    :title="text.impersonateTitle(user.name)"
    :confirm-label="text.impersonateConfirm"
    @confirm="confirm"
    @close="emit('close')"
  >
    <Note>{{ text.impersonateNote }}</Note>
    <Note>{{ text.impersonateWarning }}</Note>
  </Dialog>
</template>
