<script setup lang="ts">
/** L'entrée par Google, au-dessus du formulaire, séparée de lui par « ou ». */
import { computed, ref } from "vue";
import { Divider, ProviderButton, useMessages } from "@occulis/ui";
import { signInWithGoogle } from "../net/auth.js";
import { useAccountFlow } from "./flow.js";

const messages = useMessages();
const text = computed(() => messages.value.account);
const { notice } = useAccountFlow();
const busy = ref(false);

async function start() {
  busy.value = true;
  notice.value = undefined;
  const outcome = await signInWithGoogle();
  // En cas de succès la page part chez Google : on ne réactive rien.
  if (outcome.ok) return;
  busy.value = false;
  notice.value = { tone: "error", text: outcome.message };
}
</script>

<template>
  <ProviderButton provider="google" :disabled="busy" @click="start" />
  <Divider>{{ text.or }}</Divider>
</template>
