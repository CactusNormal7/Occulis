<script setup lang="ts">
/**
 * Le changement de mot de passe : l'adresse du compte figure dans un champ `username`
 * caché, pour que le gestionnaire de mots de passe mette à jour la bonne entrée plutôt
 * que d'en créer une nouvelle.
 */
import { computed, ref } from "vue";
import { PasswordField, SettingEditor, useMessages } from "@occulis/ui";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  PASSWORD_RULES,
  passwordHint,
} from "../../account/model.js";
import * as api from "../api.js";
import { useEditor, type EditorEvents } from "./editor.js";

defineProps<{ email: string }>();

const emit = defineEmits<EditorEvents>();

const messages = useMessages();
const text = computed(() => messages.value.profile.passwordEditor);
const { busy, error, run } = useEditor((message) => emit("done", message));
const current = ref("");
const next = ref("");

function submit() {
  void run(api.changePassword(current.value, next.value), text.value.done);
}
</script>

<template>
  <SettingEditor
    id="password-form"
    method="post"
    action="/api/auth/change-password"
    :submit-label="text.submit"
    :busy="busy"
    :error="error"
    :note="text.note"
    @submit="submit"
    @cancel="emit('cancel')"
  >
    <input type="email" name="email" autocomplete="username" :value="email" readonly hidden />
    <PasswordField
      v-model="current"
      :label="text.current"
      name="current-password"
      autocomplete="current-password"
      required
    />
    <PasswordField
      v-model="next"
      :label="text.next"
      :hint="passwordHint(next)"
      name="new-password"
      autocomplete="new-password"
      required
      :minlength="MIN_PASSWORD_LENGTH"
      :maxlength="MAX_PASSWORD_LENGTH"
      :passwordrules="PASSWORD_RULES"
    />
  </SettingEditor>
</template>
