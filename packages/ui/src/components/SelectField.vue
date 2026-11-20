<script setup lang="ts">
/** Une liste déroulante libellée, liée par `v-model`. */
import { useFieldAttributes } from "../composables/field.js";
import type { ValueOption } from "../types.js";

defineOptions({ inheritAttrs: false });

defineProps<{
  label: string;
  options: readonly ValueOption[];
}>();

const value = defineModel<string>();

const { rootAttributes, controlAttributes } = useFieldAttributes();
</script>

<template>
  <label v-bind="rootAttributes" class="occ-field">
    <span class="occ-field__label">{{ label }}</span>
    <select v-bind="controlAttributes" v-model="value" class="occ-input">
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
  </label>
</template>
