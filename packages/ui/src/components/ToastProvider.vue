<script setup lang="ts">
/**
 * Les messages éphémères, empilés en bas à droite : ils ne poussent pas la page, s'ouvrent
 * et se referment depuis leur centre, d'un cadre de leur couleur (`revealWindow`), et partent
 * d'eux-mêmes — deux fois plus lentement pour un refus — ou au clic. `useToast()` les émet
 * depuis n'importe quel descendant.
 */
import { provide, ref } from "vue";
import { TOAST_KEY, type Notify } from "../composables/toast.js";
import type { ToastMessage } from "../types.js";
import { CLOSE_MS } from "../window-reveal.js";
import ToastStack from "./ToastStack.vue";

const TOAST_MS = 4500;
/** Le temps de se refermer, et une image de marge. */
const LEAVE_MS = CLOSE_MS + 20;

const messages = ref<ToastMessage[]>([]);

function dismiss(id: number) {
  messages.value = messages.value.map((message) =>
    message.id === id ? { ...message, leaving: true } : message,
  );
  setTimeout(() => {
    messages.value = messages.value.filter((message) => message.id !== id);
  }, LEAVE_MS);
}

const notify: Notify = (text, ok = true) => {
  if (text.length === 0) return;
  const id = Date.now() + Math.random();
  messages.value = [...messages.value, { id, text, ok }];
  setTimeout(() => dismiss(id), ok ? TOAST_MS : TOAST_MS * 2);
};

provide(TOAST_KEY, notify);
</script>

<template>
  <slot />
  <ToastStack :messages="messages" @dismiss="dismiss" />
</template>
