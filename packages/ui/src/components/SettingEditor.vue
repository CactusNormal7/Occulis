<script setup lang="ts">
/**
 * L'éditeur d'un réglage : un vrai `<form>` — Entrée envoie (`submit`), et les gestionnaires
 * de mots de passe le reconnaissent —, Échap annule (`cancel`). Le premier champ prend le
 * focus à l'ouverture. L'emplacement `note` (ou la prop) précise, au pied de l'éditeur, ce
 * qui se passera après l'envoi.
 */
import { onMounted, useTemplateRef } from "vue";
import { useMessages } from "../composables/locale.js";
import Button from "./Button.vue";
import FormMessage from "./FormMessage.vue";

const props = defineProps<{
  /** Le geste du bouton d'envoi : « Enregistrer », « Envoyer le lien ». */
  submitLabel: string;
  busy?: boolean | undefined;
  /** Le refus du serveur, affiché dans l'éditeur, au-dessus des boutons. */
  error?: string | undefined;
  /** Une précision au pied de l'éditeur : ce qui se passera après l'envoi. */
  note?: string | undefined;
  danger?: boolean | undefined;
}>();

const emit = defineEmits<{ submit: []; cancel: [] }>();

const messages = useMessages();
const form = useTemplateRef<HTMLFormElement>("form");

onMounted(() => {
  form.value?.querySelector<HTMLInputElement>("input:not([type=hidden]):not([hidden])")?.focus();
});

function submit() {
  if (!props.busy) emit("submit");
}
</script>

<template>
  <form
    ref="form"
    class="occ-setting-editor"
    @submit.prevent="submit"
    @keydown.esc.prevent="emit('cancel')"
  >
    <slot />
    <p v-if="note !== undefined || $slots.note !== undefined" class="occ-setting__description">
      <slot name="note">{{ note }}</slot>
    </p>
    <FormMessage v-if="error !== undefined" tone="error">{{ error }}</FormMessage>
    <div class="occ-setting-editor__actions">
      <Button type="submit" size="sm" :variant="danger ? 'danger' : 'primary'" :disabled="busy">
        {{ busy ? "…" : submitLabel }}
      </Button>
      <Button size="sm" variant="ghost" @click="emit('cancel')">{{ messages.ui.cancel }}</Button>
    </div>
  </form>
</template>
