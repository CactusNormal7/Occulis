<script setup lang="ts">
/** La connexion par adresse et mot de passe. */
import { computed, ref } from "vue";
import { Button, FormPanel, PasswordField, TextField, useMessages } from "@occulis/ui";
import { signIn } from "../net/auth.js";
import { useAccountFlow, useSubmission } from "./flow.js";
import GoogleEntry from "./GoogleEntry.vue";
import NoticeLine from "./NoticeLine.vue";
import RouteLink from "./RouteLink.vue";

const emit = defineEmits<{ success: [] }>();

const messages = useMessages();
const text = computed(() => messages.value.account);
const { email, notice, google } = useAccountFlow();
const { busy, run, errorFor } = useSubmission("signin-form", notice);
const password = ref("");

function submit() {
  void run(
    () => signIn(email.value.trim(), password.value),
    () => emit("success"),
  );
}
</script>

<template>
  <FormPanel :title="text.signIn.title" :lead="text.signIn.lead">
    <NoticeLine />
    <GoogleEntry v-if="google" />
    <form id="signin-form" method="post" action="/api/auth/sign-in/email" @submit.prevent="submit">
      <TextField
        id="signin-email"
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
      <PasswordField
        id="signin-password"
        v-model="password"
        :label="text.password"
        :error="errorFor('password')"
        name="password"
        autocomplete="current-password"
        required
      />
      <Button type="submit" variant="primary" :disabled="busy">
        {{ busy ? text.signIn.busy : text.signIn.submit }}
      </Button>
    </form>
    <template #footer>
      <RouteLink kind="forgot">{{ text.signIn.forgot }}</RouteLink>
      <span>
        {{ text.signIn.noAccount }}
        <RouteLink kind="register">{{ text.signIn.createAccount }}</RouteLink>
      </span>
    </template>
  </FormPanel>
</template>
