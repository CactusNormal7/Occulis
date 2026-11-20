<script setup lang="ts">
/**
 * Ce que le compte connecté peut voir : une invitation à se connecter, le retour d'une
 * incarnation, un refus, ou l'écran de la route.
 */
import { computed } from "vue";
import { Button, EmptyState, useMessages } from "@occulis/ui";
import { stopImpersonating, type Identity } from "../net/auth.js";
import AdminView from "./AdminView.vue";
import { screenOf, type Route } from "./model.js";

defineProps<{
  identity: Identity;
  route: Route;
}>();

const messages = useMessages();
const text = computed(() => messages.value.admin.gate);

async function stop() {
  await stopImpersonating();
  location.reload();
}
</script>

<template>
  <EmptyState v-if="!identity.signedIn">{{ text.signIn }}</EmptyState>

  <!-- La session est celle du joueur incarné : le back-office lui est fermé, mais le
       chemin du retour doit rester à portée. -->
  <EmptyState v-else-if="identity.impersonating === true">
    {{ text.impersonating(identity.handle ?? text.aPlayer) }}
    <template #action>
      <Button variant="primary" @click="stop">{{ text.stop }}</Button>
    </template>
  </EmptyState>

  <EmptyState v-else-if="identity.admin !== true">{{ text.adminsOnly }}</EmptyState>

  <!-- Une clé par écran : l'écran suivant remplace le précédent d'un bloc, sans en garder
       l'état ; une recherche ou une page de table garde l'écran, son champ et son focus. -->
  <div v-else :key="screenOf(route)" class="occ-stack">
    <AdminView :route="route" :self="identity.handle ?? ''" />
  </div>
</template>
