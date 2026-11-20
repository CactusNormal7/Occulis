<script setup lang="ts">
/** Un curseur qui pose une propriété `--occ-*`, sa valeur rappelée dans le libellé. */
import { computed } from "vue";
import LabKnob from "./LabKnob.vue";

const props = withDefaults(
  defineProps<{
    label: string;
    /** La propriété posée, `--occ-tempo` par exemple. */
    name: string;
    min: number;
    max: number;
    step: number;
    /** La valeur tant qu'aucune surcharge n'est posée. */
    fallback: number;
    unit?: string | undefined;
    overrides: Record<string, string>;
  }>(),
  { unit: "" },
);

const emit = defineEmits<{ change: [name: string, value: string] }>();

const value = computed(() =>
  Number.parseFloat(props.overrides[props.name] ?? String(props.fallback)),
);

function input(event: Event) {
  const target = event.target as HTMLInputElement;
  emit("change", props.name, `${target.value}${props.unit}`);
}
</script>

<template>
  <LabKnob :label="`${label} · ${value}${unit}`">
    <input type="range" :min="min" :max="max" :step="step" :value="value" @input="input" />
  </LabKnob>
</template>
