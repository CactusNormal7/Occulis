<script setup lang="ts">
/**
 * Un champ de recherche, loupe à gauche, validé par Entrée : `search` part à la validation,
 * `input` à chaque frappe (pour proposer des résultats au fil de la saisie).
 */
import { computed, ref } from "vue";
import { useMessages } from "../composables/locale.js";
import Icon from "./Icon.vue";

const props = withDefaults(
  defineProps<{
    /** Le texte du champ à l'ouverture : la recherche en cours, lue dans l'URL. */
    defaultValue?: string | undefined;
    placeholder?: string | undefined;
  }>(),
  { defaultValue: "" },
);

const emit = defineEmits<{
  search: [value: string];
  input: [value: string];
}>();

const messages = useMessages();
const shownPlaceholder = computed(() => props.placeholder ?? messages.value.ui.search);
const value = ref(props.defaultValue);

function onInput(event: Event) {
  value.value = (event.target as HTMLInputElement).value;
  emit("input", value.value);
}
</script>

<template>
  <form class="occ-search" role="search" @submit.prevent="emit('search', value)">
    <Icon name="search" />
    <input
      class="occ-input"
      type="search"
      :aria-label="shownPlaceholder"
      :placeholder="shownPlaceholder"
      :value="value"
      @input="onInput"
    />
  </form>
</template>
