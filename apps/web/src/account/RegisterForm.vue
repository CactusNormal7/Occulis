<script setup lang="ts">
/** L'inscription : l'adresse, puis le pseudo, puis un mot de passe neuf. */
import { computed, ref } from "vue";
import { Button, FormPanel, PasswordField, TextField, useMessages } from "@occulis/ui";
import { register } from "../net/auth.js";
import { useAccountFlow, useSubmission } from "./flow.js";
import GoogleEntry from "./GoogleEntry.vue";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH, PASSWORD_RULES, passwordHint } from "./model.js";
import NoticeLine from "./NoticeLine.vue";
import RouteLink from "./RouteLink.vue";

const emit = defineEmits<{ success: [message: string] }>();

const messages = useMessages();
const text = computed(() => messages.value.account);
const { email, notice, google } = useAccountFlow();
const { busy, run, errorFor } = useSubmission("register-form", notice);
const handle = ref("");
const password = ref("");

function submit() {
  const address = email.value.trim();
  void run(
    () => register(address, password.value, handle.value),
    () => emit("success", text.value.register.created(address)),
  );
}
</script>

<template>
  <FormPanel :title="text.register.title" :lead="text.register.lead">
    <NoticeLine />
    <GoogleEntry v-if="google" />
    <form
      id="register-form"
      method="post"
      action="/api/auth/sign-up/email"
      @submit.prevent="submit"
    >
      <TextField
        id="register-email"
        v-model="email"
        :label="text.email"
        :error="errorFor('email')"
        name="email"
        type="email"
        inputmode="email"
        autocomplete="username"
        autocapitalize="none"
        :spellcheck="false"
        required
        autofocus
      />
      <TextField
        id="register-handle"
        v-model="handle"
        :label="text.handle"
        :hint="text.register.handleHint"
        :error="errorFor('handle')"
        name="handle"
        type="text"
        autocomplete="nickname"
        autocapitalize="none"
        :spellcheck="false"
        required
        minlength="2"
        maxlength="24"
      />
      <!-- `passwordrules` : lu par Safari et 1Password pour générer un mot de passe conforme. -->
      <PasswordField
        id="register-password"
        v-model="password"
        :label="text.password"
        :hint="passwordHint(password)"
        :error="errorFor('password')"
        name="password"
        autocomplete="new-password"
        required
        :minlength="MIN_PASSWORD_LENGTH"
        :maxlength="MAX_PASSWORD_LENGTH"
        :passwordrules="PASSWORD_RULES"
      />
      <Button type="submit" variant="primary" :disabled="busy">
        {{ busy ? text.register.busy : text.register.submit }}
      </Button>
    </form>
    <template #footer>
      <span>
        {{ text.register.hasAccount }}
        <RouteLink kind="signin">{{ text.register.signIn }}</RouteLink>
      </span>
    </template>
  </FormPanel>
</template>
