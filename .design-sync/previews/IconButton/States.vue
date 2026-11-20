<script setup lang="ts">
import { IconButton } from "@occulis/ui";
</script>

<template>
  <div style="display: flex; gap: 8px; align-items: center; padding-top: 36px">
    <IconButton icon="eye" label="Voir la partie" />
    <IconButton icon="mail" label="Marquer l'adresse vérifiée" />
    <IconButton icon="trash" label="Supprimer le compte" danger />
    <IconButton icon="ban" label="Suspendre" disabled-reason="Vous ne pouvez pas vous suspendre vous-même." />
  </div>
</template>
