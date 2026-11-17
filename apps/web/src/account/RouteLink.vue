<script setup lang="ts">
/** Un lien vers un autre parcours : une vraie URL, suivie sans recharger la page. */
import { pathOf, type RouteKind } from "./model.js";
import { useAccountFlow } from "./flow.js";

const props = defineProps<{ kind: RouteKind }>();

const { navigate } = useAccountFlow();

function follow(event: MouseEvent) {
  // Un clic modifié (nouvel onglet, nouvelle fenêtre) suit le lien comme le navigateur l'entend.
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
  event.preventDefault();
  navigate(props.kind);
}
</script>

<template>
  <a :href="pathOf(kind)" @click="follow"><slot /></a>
</template>
