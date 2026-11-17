<script setup lang="ts">
/** Le changement de pseudo. */
import { computed, ref } from "vue";
import { SettingEditor, TextField, useMessages } from "@occulis/ui";
import * as api from "../api.js";
import { useEditor, type EditorEvents } from "./editor.js";

const props = defineProps<{ current: string }>();

const emit = defineEmits<EditorEvents>();

const messages = useMessages();
const text = computed(() => messages.value.profile);
const { busy, error, run } = useEditor((message) => emit("done", message));
const handle = ref(props.current);

function submit() {
  void run(api.changeHandle(handle.value), text.value.handleEditor.done);
}
</script>

<template>
  <SettingEditor
    :submit-label="text.save"
    :busy="busy"
    :error="error"
    :note="text.handleEditor.note"
    @submit="submit"
    @cancel="emit('cancel')"
  >
    <TextField
      v-model="handle"
      :label="text.handleEditor.label"
      :hint="text.handleEditor.hint"
      name="handle"
      autocomplete="nickname"
      autocapitalize="none"
      :spellcheck="false"
      required
      minlength="2"
      maxlength="24"
    />
  </SettingEditor>
</template>
