<script setup lang="ts" generic="T">
/**
 * Le rendu d'une ressource arrivée, ou son refus. Remplace un `v-if` sur `loaded.state` :
 *
 *     <Ready :loaded="loaded" v-slot="{ value }">…</Ready>
 *
 * Un refus prend la place du contenu, dans la teinte des refus.
 */
import { EmptyState } from "@occulis/ui";
import type { Loaded } from "./cache.js";

defineProps<{ loaded: Loaded<T> }>();

defineSlots<{ default: (scope: { value: T }) => unknown }>();
</script>

<template>
  <EmptyState v-if="loaded.state === 'failed'" error>{{ loaded.message }}</EmptyState>
  <slot v-else :value="loaded.value" />
</template>
