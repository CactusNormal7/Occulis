<script setup lang="ts">
/**
 * Une fenêtre modale d'aperçu ne sait pas se fermer (son `close` n'est écouté par personne) :
 * Échap ou un clic sur son voile la démontent ici, de l'extérieur.
 */
import { onBeforeUnmount, onMounted } from "vue";

const emit = defineEmits<{ close: [] }>();

function onKey(event: KeyboardEvent) {
  if (event.key === "Escape") emit("close");
}

function onClick(event: MouseEvent) {
  if (event.target instanceof HTMLDialogElement) emit("close");
}

onMounted(() => window.addEventListener("keydown", onKey, true));
onBeforeUnmount(() => window.removeEventListener("keydown", onKey, true));
</script>

<template>
  <div @click.capture="onClick">
    <slot />
  </div>
</template>
