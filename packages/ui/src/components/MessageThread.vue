<script setup lang="ts">
/**
 * Un fil de messages entre deux personnes : les siens à droite, ceux de l'autre à gauche,
 * au trait, sans bulle pleine — la ligne de la DA. Le fil reste calé sur le dernier
 * message à chaque arrivée. L'emplacement `more` porte, au-dessus du fil, le geste qui
 * charge les messages plus anciens.
 */
import { computed, useTemplateRef, watch } from "vue";
import { useMessages } from "../composables/locale.js";
import type { ThreadMessage } from "../types.js";
import EmptyState from "./EmptyState.vue";

const props = defineProps<{
  /** Du plus ancien au plus récent ; le fil défile jusqu'au dernier. */
  messages: readonly ThreadMessage[];
  empty?: string | undefined;
}>();

const text = useMessages();
const end = useTemplateRef<HTMLDivElement>("end");
const lastId = computed(() => props.messages[props.messages.length - 1]?.id);

watch(lastId, () => end.value?.scrollIntoView?.({ block: "nearest" }), {
  flush: "post",
  immediate: true,
});
</script>

<template>
  <EmptyState v-if="messages.length === 0">{{ empty ?? text.ui.noMessages }}</EmptyState>
  <div v-else class="occ-thread" role="log" aria-live="polite">
    <slot name="more" />
    <div
      v-for="message in messages"
      :key="message.id"
      :class="['occ-thread__message', { 'occ-thread__message--mine': message.mine }]"
    >
      <p>{{ message.body }}</p>
      <small v-if="message.meta !== undefined">{{ message.meta }}</small>
    </div>
    <div ref="end" />
  </div>
</template>
