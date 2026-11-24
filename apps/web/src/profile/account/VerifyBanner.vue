<script setup lang="ts">
/** Le rappel d'une adresse à vérifier, avec le renvoi du lien. */
import { computed, ref } from "vue";
import type { MeProfile } from "@occulis/protocol";
import { Banner, Button, useMessages, useToast } from "@occulis/ui";
import * as api from "../api.js";

const props = defineProps<{
  profile: MeProfile;
  readOnly: boolean;
}>();

const messages = useMessages();
const text = computed(() => messages.value.profile.verify);
const notify = useToast();
const sent = ref(false);

async function resend() {
  const outcome = await api.resendVerification(props.profile.email);
  notify(outcome.ok ? text.value.resent(props.profile.email) : outcome.message, outcome.ok);
  if (outcome.ok) sent.value = true;
}
</script>

<template>
  <Banner icon="mail">
    {{ text.text }}
    <template #action>
      <Button :disabled="readOnly || sent" @click="resend">
        {{ sent ? text.sent : text.resend }}
      </Button>
    </template>
  </Banner>
</template>
