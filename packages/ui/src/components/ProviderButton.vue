<script setup lang="ts">
/**
 * « Continuer avec Google ». Le logo est monochrome, en `currentColor`, comme toute icône
 * de la charte : la couleur reste réservée à l'information de partie. Le contenu remplace
 * le libellé par défaut.
 */
import { useMessages } from "../composables/locale.js";

withDefaults(
  defineProps<{
    provider: "google";
    type?: "button" | "submit" | undefined;
  }>(),
  { type: "button" },
);

const messages = useMessages();
</script>

<template>
  <button :type="type" class="occ-provider">
    <svg
      v-if="provider === 'google'"
      class="occ-provider__mark"
      viewBox="0 0 48 48"
      width="18"
      height="18"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.2C12.4 13.7 17.7 9.5 24 9.5z"
      />
      <path
        fill="currentColor"
        d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.4-4.6 7l7.4 5.8c4.3-4 6.9-9.9 6.9-17.3z"
      />
      <path
        fill="currentColor"
        d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.2C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.8l7.9-6.2z"
      />
      <path
        fill="currentColor"
        d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.8c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.2-13.5-10l-7.9 6.2C6.6 42.6 14.6 48 24 48z"
      />
    </svg>
    <span
      ><slot>{{ messages.ui.continueWithGoogle }}</slot></span
    >
  </button>
</template>
