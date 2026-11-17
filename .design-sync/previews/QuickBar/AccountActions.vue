<script setup lang="ts">
import { IconButton, QuickBar } from "@occulis/ui";
</script>

<template>
  <QuickBar framed>
    <IconButton icon="mail" label="Marquer l'adresse vérifiée" />
    <IconButton icon="shield" label="Nommer administrateur" />
    <IconButton icon="ban" label="Suspendre" danger />
    <IconButton icon="impersonate" label="Se connecter en tant que ce joueur" />
    <IconButton icon="logout" label="Fermer toutes les sessions" />
    <IconButton icon="trash" label="Supprimer le compte" danger />
  </QuickBar>
</template>
