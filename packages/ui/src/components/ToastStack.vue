<script setup lang="ts">
/** La pile affichée par `ToastProvider` ; utilisable seule pour montrer des messages fixes. */
import type { ToastMessage } from "../types.js";
import ToastItem from "./ToastItem.vue";

defineProps<{ messages: readonly ToastMessage[] }>();

const emit = defineEmits<{ dismiss: [id: number] }>();
</script>

<template>
  <div class="occ-toasts" aria-live="polite">
    <ToastItem
      v-for="message in messages"
      :key="message.id"
      :message="message"
      @dismiss="emit('dismiss', message.id)"
    />
  </div>
</template>
