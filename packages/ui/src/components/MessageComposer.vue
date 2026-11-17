<script setup lang="ts">
/** Le champ d'écriture d'un fil : Entrée envoie, Maj+Entrée passe à la ligne. */
import { computed, ref } from "vue";
import { useMessages } from "../composables/locale.js";

const props = defineProps<{
  /**
   * L'envoi, lié par `@send`. C'est une prop plutôt qu'un événement parce qu'on en attend la
   * réponse : vrai si le message est parti, et le champ se vide alors.
   */
  onSend: (body: string) => Promise<boolean>;
  disabled?: boolean | undefined;
  placeholder?: string | undefined;
  maxlength?: number | undefined;
  /** Le libellé du bouton d'envoi ; celui de la charte par défaut. */
  sendLabel?: string | undefined;
}>();

const messages = useMessages();
const shownPlaceholder = computed(() => props.placeholder ?? messages.value.ui.messagePlaceholder);
const value = ref("");
const busy = ref(false);
const empty = computed(() => value.value.trim().length === 0);

async function send() {
  const body = value.value.trim();
  if (body.length === 0 || busy.value) return;
  busy.value = true;
  const sent = await props.onSend(body);
  busy.value = false;
  if (sent) value.value = "";
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    void send();
  }
}
</script>

<template>
  <form class="occ-composer" @submit.prevent="send">
    <textarea
      v-model="value"
      class="occ-input"
      :aria-label="shownPlaceholder"
      :placeholder="shownPlaceholder"
      rows="2"
      :maxlength="maxlength"
      :disabled="disabled"
      @keydown="onKeydown"
    />
    <button
      type="submit"
      class="occ-button occ-button--primary occ-button--md"
      :disabled="disabled || busy || empty"
    >
      {{ sendLabel ?? messages.ui.send }}
    </button>
  </form>
</template>
