<script setup lang="ts">
/**
 * Un élément encore en chantier : un ruban jaune et noir sur son bord haut et une petite
 * étiquette, sans rien changer à son contenu. Il signale qu'on montre un rendu, pas encore
 * une donnée : ce qu'il entoure peut être factice. Il part avec l'élément, une fois fini.
 */
import { computed } from "vue";
import { useMessages } from "../composables/locale.js";

const props = defineProps<{
  /** Ce qui manque encore, en infobulle : « données factices ». Un texte générique sinon. */
  note?: string | undefined;
}>();

const messages = useMessages();
const wip = computed(() => messages.value.ui.wip);
const detail = computed(() => props.note ?? wip.value.note);
</script>

<template>
  <div class="occ-wip" :title="detail">
    <span class="occ-wip__tag" :aria-label="`${wip.label} — ${detail}`">{{ wip.tag }}</span>
    <slot />
  </div>
</template>
