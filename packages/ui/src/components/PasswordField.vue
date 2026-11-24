<script setup lang="ts">
/**
 * Un champ de mot de passe, avec un bouton pour l'afficher. Le champ reste de type
 * `password` tant qu'on ne le demande pas — c'est à ce type que les gestionnaires de mots
 * de passe le reconnaissent — et le bouton n'est jamais un `submit`.
 */
import { ref } from "vue";
import { useFieldAttributes, useFieldDescription } from "../composables/field.js";
import { useMessages } from "../composables/locale.js";
import Icon from "./Icon.vue";

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  /** Le libellé, au-dessus du champ, en minuscules estompées. */
  label: string;
  /** `current-password` pour se connecter, `new-password` pour en choisir un. */
  autocomplete: "current-password" | "new-password";
  /** Une précision sous le champ. */
  hint?: string | undefined;
  /** Le refus propre à ce champ, sous lui, dans la teinte des refus. */
  error?: string | undefined;
}>();

const value = defineModel<string>();
const shown = ref(false);

const messages = useMessages();
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
    <span class="occ-password">
      <input
        v-bind="controlAttributes"
        v-model="value"
        class="occ-input"
        :type="shown ? 'text' : 'password'"
        :autocomplete="autocomplete"
        spellcheck="false"
        autocapitalize="none"
        :aria-invalid="error !== undefined || undefined"
        :aria-describedby="describedBy"
      />
      <button
        type="button"
        class="occ-password__toggle"
        :aria-pressed="shown"
        :aria-label="shown ? messages.ui.hidePassword : messages.ui.showPassword"
        @click="shown = !shown"
      >
        <Icon :name="shown ? 'eyeOff' : 'eye'" />
      </button>
    </span>
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
