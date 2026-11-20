<script setup lang="ts">
/**
 * La suppression demande de retaper le pseudo : un bouton « OK » se valide d'un réflexe,
 * et ce geste-ci ne se défait pas.
 */
import { computed, ref } from "vue";
import { Dialog, Note, TextField, useMessages, useToast } from "@occulis/ui";
import * as api from "../api.js";
import type { QuickUser } from "./act.js";

const props = defineProps<{ user: QuickUser }>();

const emit = defineEmits<{ close: []; deleted: [] }>();

const messages = useMessages();
const text = computed(() => messages.value.admin.actions);
const notify = useToast();
const retyped = ref("");

async function confirm() {
  const outcome = await api.remove(props.user.id);
  if (!outcome.ok) {
    notify(outcome.message, false);
    return false;
  }
  emit("deleted");
  return true;
}
</script>

<template>
  <Dialog
    open
    :title="text.deleteTitle(user.name)"
    :confirm-label="text.deleteConfirm"
    danger
    :ready="retyped === user.name"
    @confirm="confirm"
    @close="emit('close')"
  >
    <Note>{{ text.deleteNote }}</Note>
    <TextField v-model="retyped" :label="text.retype(user.name)" />
  </Dialog>
</template>
