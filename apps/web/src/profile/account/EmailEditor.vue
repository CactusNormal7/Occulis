<script setup lang="ts">
/**
 * Le changement d'adresse : un lien part vers la nouvelle — et, pour un compte vérifié,
 * d'abord vers l'ancienne, qui doit le confirmer.
 */
import { computed, ref } from "vue";
import type { MeProfile } from "@occulis/protocol";
import { SettingEditor, TextField, useMessages } from "@occulis/ui";
import * as api from "../api.js";
import { useEditor, type EditorEvents } from "./editor.js";

const props = defineProps<{ profile: MeProfile }>();

const emit = defineEmits<EditorEvents>();

const messages = useMessages();
const text = computed(() => messages.value.profile);
const { busy, error, run } = useEditor((message) => emit("done", message));
const email = ref("");

const note = computed(() =>
  props.profile.emailVerified
    ? text.value.emailEditor.noteVerified(props.profile.email)
    : text.value.emailEditor.noteUnverified,
);

function submit() {
  const address = email.value.trim();
  const done = props.profile.emailVerified
    ? text.value.emailEditor.doneVerified(props.profile.email)
    : text.value.emailEditor.doneUnverified(address);
  void run(api.changeEmail(address), done);
}
</script>

<template>
  <SettingEditor
    :submit-label="text.sendLink"
    :busy="busy"
    :error="error"
    :note="note"
    @submit="submit"
    @cancel="emit('cancel')"
  >
    <TextField
      v-model="email"
      :label="text.emailEditor.label"
      name="email"
      type="email"
      inputmode="email"
      autocomplete="email"
      autocapitalize="none"
      :spellcheck="false"
      required
    />
  </SettingEditor>
</template>
