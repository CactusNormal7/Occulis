<script setup lang="ts">
/** La création d'un compte, depuis la liste. */
import { computed, ref } from "vue";
import { Dialog, Note, SelectField, TextField, useMessages, useToast } from "@occulis/ui";
import * as api from "../api.js";
import { useGo } from "./act.js";

const emit = defineEmits<{ close: [] }>();

const messages = useMessages();
const text = computed(() => messages.value.admin.actions);
const notify = useToast();
const go = useGo();

const name = ref("");
const email = ref("");
const password = ref("");
const role = ref("user");

const roles = computed(() => [
  { value: "user", label: text.value.roles.user },
  { value: "admin", label: text.value.roles.admin },
  { value: "goy", label: text.value.roles.goy },
]);

const ready = computed(
  () => name.value.trim().length >= 2 && email.value.includes("@") && password.value.length > 0,
);

async function confirm() {
  const result = await api.create(email.value, password.value, name.value, role.value);
  if (!result.ok) {
    notify(result.message, false);
    return false;
  }
  const created = result.value.user;
  go({ view: "user", id: created.id }, text.value.created(created.name));
  return true;
}
</script>

<template>
  <Dialog
    open
    :title="text.createTitle"
    :confirm-label="text.create"
    :ready="ready"
    @confirm="confirm"
    @close="emit('close')"
  >
    <TextField v-model="name" :label="text.handle" />
    <TextField v-model="email" :label="text.address" type="email" />
    <TextField v-model="password" :label="text.password" type="password" />
    <SelectField v-model="role" :label="text.role" :options="roles" />
    <Note>{{ text.createNote }}</Note>
  </Dialog>
</template>
