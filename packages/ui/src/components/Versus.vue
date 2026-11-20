<script setup lang="ts">
/**
 * L'en-tête d'une partie : les deux sièges, chacun dans la couleur de son camp. L'emplacement
 * `end` s'aligne à droite : le résultat (`Badge tone="A"|"B"`), un état.
 */
import { useMessages } from "../composables/locale.js";
import type { VersusSide } from "../types.js";
import Person from "./Person.vue";

defineProps<{
  /** Le joueur du siège A, dans la couleur de son camp. */
  a: VersusSide;
  /** Le joueur du siège B. */
  b: VersusSide;
}>();

const messages = useMessages();
</script>

<template>
  <section class="occ-versus">
    <Person :name="a.name" :detail="messages.ui.versus.seat('A')" camp="A" :href="a.href" />
    <span class="occ-label">{{ messages.ui.versus.against }}</span>
    <Person :name="b.name" :detail="messages.ui.versus.seat('B')" camp="B" :href="b.href" />
    <div v-if="$slots.end !== undefined" class="occ-versus__end"><slot name="end" /></div>
  </section>
</template>
