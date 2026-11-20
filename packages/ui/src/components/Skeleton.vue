<script setup lang="ts">
/**
 * La place d'un contenu qui n'est pas encore arrivé. Elle n'apparaît qu'après un court
 * délai, porté par la feuille et non par une minuterie : une réponse rapide ne fait rien
 * clignoter, une réponse lente montre que quelque chose vient plutôt qu'une page vide.
 */
import { useMessages } from "../composables/locale.js";
import SkeletonLines from "./SkeletonLines.vue";

withDefaults(
  defineProps<{
    /** Le nombre de lignes de texte simulées. */
    lines?: number | undefined;
    /** Encadrées comme une `Card` : la place d'un bloc plutôt que d'un paragraphe. */
    card?: boolean | undefined;
  }>(),
  { lines: 3 },
);

const messages = useMessages();
</script>

<template>
  <SkeletonLines
    :lines="lines"
    :card="card"
    role="status"
    aria-busy="true"
    :aria-label="messages.ui.loading"
  />
</template>
