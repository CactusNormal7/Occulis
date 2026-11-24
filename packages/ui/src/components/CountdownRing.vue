<script setup lang="ts">
/**
 * Un compte à rebours au trait : un anneau qui se vide. Piloté par ses propriétés et non
 * par une animation CSS — sous mouvement réduit, une animation serait écrasée à zéro et
 * l'anneau se viderait d'un coup, alors que le temps restant est une information.
 * Sous les cinq dernières secondes, il passe dans la teinte des refus. Le contenu, au
 * centre, est en général le nombre de secondes.
 */
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    /** La durée totale, qui donne la proportion. */
    totalMs: number;
    /** Ce qui reste ; c'est l'appelant qui le fait décroître, le composant ne tient aucune horloge. */
    remainingMs: number;
    size?: "sm" | "lg" | undefined;
    /** Le libellé accessible : « Temps restant ». */
    label: string;
  }>(),
  { size: "sm" },
);

const URGENT_MS = 5000;
const RADIUS = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const fraction = computed(() =>
  props.totalMs <= 0 ? 0 : Math.min(1, Math.max(0, props.remainingMs / props.totalMs)),
);
</script>

<template>
  <span
    :class="[
      'occ-countdown',
      `occ-countdown--${size}`,
      { 'occ-countdown--urgent': remainingMs <= URGENT_MS },
    ]"
    role="timer"
    :aria-label="label"
  >
    <svg viewBox="0 0 36 36" aria-hidden="true">
      <circle class="occ-countdown__track" cx="18" cy="18" :r="RADIUS" />
      <circle
        class="occ-countdown__arc"
        cx="18"
        cy="18"
        :r="RADIUS"
        :stroke-dasharray="CIRCUMFERENCE"
        :stroke-dashoffset="CIRCUMFERENCE * (1 - fraction)"
      />
    </svg>
    <span v-if="$slots.default !== undefined" class="occ-countdown__value"><slot /></span>
  </span>
</template>
