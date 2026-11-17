<script setup lang="ts">
/** Un compte Google sans mot de passe en obtient un par le lien envoyé à son adresse. */
import { computed } from "vue";
import { Note, SettingEditor, useMessages } from "@occulis/ui";
import * as api from "../api.js";
import { useEditor, type EditorEvents } from "./editor.js";

const props = defineProps<{ email: string }>();

const emit = defineEmits<EditorEvents>();

const messages = useMessages();
const text = computed(() => messages.value.profile);
const { busy, error, run } = useEditor((message) => emit("done", message));

function submit() {
  void run(api.requestPasswordSetup(props.email), text.value.passwordSetup.done(props.email));
}
</script>

<template>
  <SettingEditor
    :submit-label="text.sendLink"
    :busy="busy"
    :error="error"
    @submit="submit"
    @cancel="emit('cancel')"
  >
    <Note>{{ text.passwordSetup.note(email) }}</Note>
  </SettingEditor>
</template>
