<script setup lang="ts">
/**
 * La réinitialisation, depuis le lien reçu : un mot de passe neuf. Sans jeton valable dans
 * l'URL, l'écran ne propose que de demander un autre lien.
 */
import { computed, ref } from "vue";
import { Button, FormPanel, PasswordField, TextField, useMessages } from "@occulis/ui";
import { resetPassword } from "../net/auth.js";
import { useAccountFlow, useSubmission } from "./flow.js";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  PASSWORD_RULES,
  forgetResetEmail,
  passwordHint,
  recallResetEmail,
  type Notice,
} from "./model.js";
import NoticeLine from "./NoticeLine.vue";
import RouteLink from "./RouteLink.vue";

const props = defineProps<{ token: string | undefined }>();

const messages = useMessages();
const text = computed(() => messages.value.account);
const { email, notice, navigate } = useAccountFlow();
const { busy, run, errorFor } = useSubmission("reset-form", notice);
/** L'adresse du compte, rappelée depuis la demande : elle rattache le mot de passe à la bonne entrée. */
const account = ref(recallResetEmail());
const password = ref("");

const invalidLink = computed<Notice>(() => ({
  tone: "error",
  text: text.value.reset.invalid,
  retry: "reset",
}));

function submit() {
  const token = props.token;
  if (token === undefined) return;
  void run(
    () => resetPassword(token, password.value),
    () => {
      forgetResetEmail();
      email.value = account.value;
      navigate("signin", { tone: "success", text: text.value.reset.done });
    },
  );
}
</script>

<template>
  <FormPanel v-if="token === undefined" :title="text.reset.title">
    <NoticeLine :fallback="invalidLink" />
    <template #footer>
      <RouteLink kind="signin">{{ text.backToSignIn }}</RouteLink>
    </template>
  </FormPanel>

  <FormPanel v-else :title="text.reset.title" :lead="text.reset.lead">
    <NoticeLine />
    <form id="reset-form" method="post" action="/api/auth/reset-password" @submit.prevent="submit">
      <!-- Rattache le nouveau mot de passe à la bonne entrée du gestionnaire. Le serveur ne
           l'utilise pas : le jeton désigne déjà le compte. -->
      <TextField
        id="reset-email"
        v-model="account"
        :label="text.reset.accountEmail"
        name="email"
        type="email"
        autocomplete="username"
        autocapitalize="none"
        :spellcheck="false"
      />
      <PasswordField
        id="reset-password"
        v-model="password"
        :label="text.reset.newPassword"
        :hint="passwordHint(password)"
        :error="errorFor('password')"
        name="password"
        autocomplete="new-password"
        required
        autofocus
        :minlength="MIN_PASSWORD_LENGTH"
        :maxlength="MAX_PASSWORD_LENGTH"
        :passwordrules="PASSWORD_RULES"
      />
      <Button type="submit" variant="primary" :disabled="busy">
        {{ busy ? text.reset.busy : text.reset.submit }}
      </Button>
    </form>
    <template #footer>
      <RouteLink kind="signin">{{ text.backToSignIn }}</RouteLink>
    </template>
  </FormPanel>
</template>
