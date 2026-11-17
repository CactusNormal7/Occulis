<script setup lang="ts">
import { DefinitionList } from "@occulis/ui";

const entries = [
  { label: "adresse", value: "anne@occulis.test" },
  { label: "rôle", value: "joueur" },
  { label: "inscription", value: "2026-10-03 09:12" },
  { label: "état", value: "actif" },
];
</script>

<template>
  <DefinitionList :entries="entries" />
</template>
