<script setup lang="ts">
/**
 * Un champ de saisie libellé, lié par `v-model`. L'aide (`hint`, prop ou emplacement) et
 * l'erreur lui sont rattachées par `aria-describedby`.
 */
import { useFieldAttributes, useFieldDescription } from "../composables/field.js";

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    /** Le libellé, au-dessus du champ, en minuscules estompées. */
    label: string;
    /** Une précision sous le champ. */
    hint?: string | undefined;
    /** Le refus propre à ce champ, sous lui, dans la teinte des refus. */
    error?: string | undefined;
    type?: "text" | "email" | "password" | "search" | "number" | undefined;
  }>(),
  { type: "text" },
);

const value = defineModel<string>();

const slots = defineSlots<{ hint?: () => unknown }>();
const { rootAttributes, controlAttributes } = useFieldAttributes();
const { hintId, errorId, describedBy } = useFieldDescription(
  () => props.hint !== undefined || slots.hint !== undefined,
  () => props.error !== undefined,
);
</script>

<template>
  <label
    v-bind="rootAttributes"
    :class="['occ-field', { 'occ-field--error': error !== undefined }]"
  >
    <span class="occ-field__label">{{ label }}</span>
    <input
      v-bind="controlAttributes"
      v-model="value"
      class="occ-input"
      :type="type"
      :aria-invalid="error !== undefined || undefined"
      :aria-describedby="describedBy"
    />
    <small v-if="error !== undefined" :id="errorId" class="occ-field__error">{{ error }}</small>
    <small
      v-if="hint !== undefined || $slots.hint !== undefined"
      :id="hintId"
      class="occ-field__hint"
    >
      <slot name="hint">{{ hint }}</slot>
    </small>
  </label>
</template>
