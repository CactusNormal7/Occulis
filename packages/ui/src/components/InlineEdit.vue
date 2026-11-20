<script setup lang="ts">
/** Un champ et son bouton sur une ligne : l'édition d'une seule valeur, sur place. */
import { ref } from "vue";

const props = withDefaults(
  defineProps<{
    label: string;
    type?: "text" | "email" | "password" | undefined;
    defaultValue?: string | undefined;
    /** Le libellé du bouton : un verbe (« Renommer », « Définir »). */
    action: string;
    /**
     * L'envoi, lié par `@submit`. C'est une prop plutôt qu'un événement parce qu'on en
     * attend la réponse : le bouton reste inactif jusqu'à ce que la promesse rendue se règle.
     */
    onSubmit: (value: string) => Promise<unknown> | void;
  }>(),
  { type: "text", defaultValue: "" },
);

const value = ref(props.defaultValue);
const busy = ref(false);

async function submit() {
  busy.value = true;
  try {
    await props.onSubmit(value.value);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <form class="occ-inline-edit" @submit.prevent="submit">
    <span class="occ-field__label">{{ label }}</span>
    <input
      v-model="value"
      class="occ-input"
      :type="type"
      :aria-label="label"
      :placeholder="label"
    />
    <button type="submit" class="occ-button occ-button--default occ-button--md" :disabled="busy">
      {{ action }}
    </button>
  </form>
</template>
