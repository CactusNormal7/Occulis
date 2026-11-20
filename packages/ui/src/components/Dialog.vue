<script setup lang="ts">
/**
 * Une fenêtre modale sur `<dialog>` natif : focus piégé, Échap, page inerte derrière.
 * Elle s'ouvre et se referme depuis son centre (`revealWindow`), sur un voile tramé qui se pose
 * en fondu ; un clic sur le voile la ferme aussi.
 */
import { onMounted, ref, useId, useTemplateRef, watch } from "vue";
import { useMessages } from "../composables/locale.js";
import { revealWindow } from "../window-reveal.js";
import Button from "./Button.vue";
import IconButton from "./IconButton.vue";

const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    /** Le libellé du bouton de confirmation : le geste, pas « OK ». */
    confirmLabel: string;
    /** Le geste est destructeur : confirmation dans la teinte des refus. */
    danger?: boolean | undefined;
    /** Rend la confirmation possible (un champ à retaper, une saisie valide). */
    ready?: boolean | undefined;
    /**
     * La confirmation, liée par `@confirm`. C'est une prop plutôt qu'un événement parce qu'on
     * en attend la réponse : `true` ferme la fenêtre ; `false` la garde ouverte, pour un refus
     * du serveur que l'appelant affiche.
     */
    onConfirm: () => Promise<boolean> | boolean;
    /** Le libellé du bouton qui renonce ; « Annuler » par défaut. */
    cancelLabel?: string | undefined;
    /**
     * Faux : ni croix, ni Échap, ni clic sur le voile — seuls les deux boutons répondent. Pour
     * une question qui attend une réponse explicite, comme accepter une partie.
     */
    dismissible?: boolean | undefined;
  }>(),
  { ready: true, dismissible: true },
);

/** `close` part une fois l'animation de fermeture finie. */
const emit = defineEmits<{ close: [] }>();

const messages = useMessages();
const dialog = useTemplateRef<HTMLDialogElement>("dialog");
const titleId = useId();
const closing = ref(false);
const busy = ref(false);

function syncWithOpen() {
  const element = dialog.value;
  if (element === null) return;
  if (props.open && !element.open) {
    closing.value = false;
    element.showModal();
    void revealWindow(element);
    element.querySelector<HTMLElement>("input, select")?.focus();
  }
  if (!props.open && element.open) element.close();
}

onMounted(syncWithOpen);
watch(() => props.open, syncWithOpen);

async function close() {
  const element = dialog.value;
  if (closing.value || element === null) return;
  closing.value = true;
  await revealWindow(element, "close");
  emit("close");
}

async function submit() {
  if (!props.ready || busy.value) return;
  busy.value = true;
  let done: boolean;
  try {
    done = await props.onConfirm();
  } catch {
    // Une confirmation qui échoue laisse la fenêtre ouverte et le bouton de nouveau actif.
    done = false;
  }
  busy.value = false;
  if (done) await close();
}

function onCancel() {
  if (props.dismissible) void close();
}

function onBackdropClick(event: MouseEvent) {
  if (props.dismissible && event.target === dialog.value) void close();
}
</script>

<template>
  <dialog
    ref="dialog"
    :aria-labelledby="titleId"
    :class="['occ-dialog', { 'occ-dialog--closing': closing }]"
    @cancel.prevent="onCancel"
    @click="onBackdropClick"
  >
    <form @submit.prevent="submit">
      <header class="occ-dialog__head">
        <h2 :id="titleId">{{ title }}</h2>
        <IconButton v-if="dismissible" icon="close" :label="messages.ui.close" @click="close" />
      </header>
      <div class="occ-dialog__body"><slot /></div>
      <footer class="occ-dialog__foot">
        <Button variant="ghost" @click="close">{{ cancelLabel ?? messages.ui.cancel }}</Button>
        <Button type="submit" :variant="danger ? 'danger' : 'primary'" :disabled="!ready || busy">
          {{ confirmLabel }}
        </Button>
      </footer>
    </form>
  </dialog>
</template>
