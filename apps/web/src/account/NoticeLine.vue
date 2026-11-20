<script setup lang="ts">
/** L'avis en tête d'un formulaire : une réussite, un refus, et le geste qui le répare. */
import { computed } from "vue";
import { Button, FormMessage, useMessages } from "@occulis/ui";
import { useAccountFlow } from "./flow.js";
import type { Notice } from "./model.js";

/** Un avis à montrer à la place de celui du parcours (un lien de réinitialisation périmé). */
const props = defineProps<{ fallback?: Notice | undefined }>();

const messages = useMessages();
const text = computed(() => messages.value.account);
const flow = useAccountFlow();
const notice = computed(() => flow.notice.value ?? props.fallback);
</script>

<template>
  <FormMessage v-if="notice !== undefined" :tone="notice.tone">
    {{ notice.text }}
    <template v-if="notice.retry === 'verification'">{{ text.verificationRetry }}</template>
    <template v-if="notice.retry === 'reset'" #action>
      <Button size="sm" @click="flow.navigate('forgot')">{{ text.newLink }}</Button>
    </template>
  </FormMessage>
</template>
