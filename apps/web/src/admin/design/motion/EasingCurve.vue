<script setup lang="ts">
/** Une courbe d'accélération tracée, et le point qui la parcourt à `progress`. */
import { computed } from "vue";

const props = defineProps<{
  curve: (t: number) => number;
  /** L'avancée du point, de 0 à 1. */
  progress: number;
}>();

/** Le cadre du tracé ; `low` et `high` laissent la place aux dépassements d'`easeOutBack`. */
const PLOT = { width: 220, height: 72, low: -0.15, high: 1.2 } as const;
const SAMPLES = 48;

function y(value: number): number {
  return PLOT.height - ((value - PLOT.low) / (PLOT.high - PLOT.low)) * PLOT.height;
}

const points = computed(() =>
  Array.from({ length: SAMPLES + 1 }, (_, i) => i / SAMPLES)
    .map((t) => `${(t * PLOT.width).toFixed(1)},${y(props.curve(t)).toFixed(1)}`)
    .join(" "),
);
</script>

<template>
  <svg
    :width="PLOT.width"
    :height="PLOT.height"
    :viewBox="`0 0 ${PLOT.width} ${PLOT.height}`"
    aria-hidden="true"
  >
    <line
      x1="0"
      :x2="PLOT.width"
      :y1="y(1)"
      :y2="y(1)"
      stroke="currentColor"
      stroke-opacity="0.15"
      stroke-dasharray="2 3"
    />
    <polyline :points="points" fill="none" stroke="currentColor" stroke-opacity="0.6" />
    <rect
      :x="progress * PLOT.width - 3"
      :y="y(curve(progress)) - 3"
      width="6"
      height="6"
      fill="currentColor"
    />
  </svg>
</template>
