<script setup lang="ts">
/** Un chiffre clé : grand nombre, libellé en capitales. */
import { ref, watchEffect } from "vue";

const props = withDefaults(
  defineProps<{
    value: number;
    label: string;
    /** Une précision sous le libellé : une tendance, une part. */
    detail?: string | undefined;
    /** Rend la tuile cliquable vers la liste qu'elle résume. */
    href?: string | undefined;
    /** Le chiffre monte de zéro à sa valeur à l'affichage. Coupé si le système demande moins de mouvement. */
    animate?: boolean | undefined;
  }>(),
  { animate: true },
);

/** Le nombre affiché : la valeur, ou l'étape où en est la montée. */
const shown = ref(props.value);

const RISE_MS = 700;

watchEffect((onCleanup) => {
  const target = props.value;
  const reducedMotion =
    typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (
    !props.animate ||
    target === 0 ||
    reducedMotion ||
    typeof requestAnimationFrame !== "function"
  ) {
    shown.value = target;
    return;
  }

  const start = performance.now();
  let frame = 0;
  const step = (now: number) => {
    const progress = Math.min((now - start) / RISE_MS, 1);
    // Une montée qui ralentit en approchant de la valeur (sortie cubique).
    shown.value = Math.round(target * (1 - (1 - progress) ** 3));
    if (progress < 1) frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
  onCleanup(() => cancelAnimationFrame(frame));
});
</script>

<template>
  <component
    :is="href === undefined ? 'div' : 'a'"
    :class="['occ-stat-tile', { 'occ-stat-tile--link': href !== undefined }]"
    :href="href"
  >
    <strong>{{ shown }}</strong>
    <span class="occ-label">{{ label }}</span>
    <small v-if="detail !== undefined">{{ detail }}</small>
  </component>
</template>
