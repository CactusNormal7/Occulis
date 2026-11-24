<script setup lang="ts">
/** Le mot de passe oublié : un lien de réinitialisation part vers l'adresse donnée. */
import { computed } from "vue";
import { Button, FormPanel, TextField, useMessages } from "@occulis/ui";
import { requestReset } from "../net/auth.js";
import { useAccountFlow, useSubmission } from "./flow.js";
import { rememberResetEmail } from "./model.js";
import NoticeLine from "./NoticeLine.vue";
import RouteLink from "./RouteLink.vue";

const messages = useMessages();
const text = computed(() => messages.value.account);
const { email, notice } = useAccountFlow();
const { busy, run, errorFor } = useSubmission("forgot-form", notice);

function submit() {
  const address = email.value.trim();
  void run(
    () => requestReset(address),
    () => {
      rememberResetEmail(address);
      // La même phrase que l'adresse ait un compte ou non : le serveur ne le dit pas,
      // l'interface ne doit pas le laisser deviner.
      notice.value = { tone: "success", text: text.value.forgot.sent(address) };
    },
  );
}
</script>

<template>
  <FormPanel :title="text.forgot.title" :lead="text.forgot.lead">
    <NoticeLine />
    <form
      id="forgot-form"
      method="post"
      action="/api/auth/request-password-reset"
      @submit.prevent="submit"
    >
      <TextField
        id="forgot-email"
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
      <Button type="submit" variant="primary" :disabled="busy">
        {{ busy ? text.forgot.busy : text.forgot.submit }}
      </Button>
    </form>
    <template #footer>
      <RouteLink kind="signin">{{ text.backToSignIn }}</RouteLink>
    </template>
  </FormPanel>
</template>
