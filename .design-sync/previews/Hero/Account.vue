<script setup lang="ts">
import { Badge, BadgeRow, Hero, IconButton, QuickBar, TileAvatar } from "@occulis/ui";
</script>

<template>
  <Hero title="anne">
    <template #avatar><TileAvatar name="anne" size="lg" /></template>
    <template #badges>
      <BadgeRow><Badge>vérifiée</Badge></BadgeRow>
    </template>
    <template #meta>
      <span>anne@occulis.test</span>
      <span>inscrite le 2026-10-03 09:12</span>
    </template>
    <template #actions>
      <QuickBar framed>
        <IconButton icon="mail" label="Marquer l'adresse non vérifiée" />
        <IconButton icon="shield" label="Nommer administrateur" />
        <IconButton icon="ban" label="Suspendre" danger />
        <IconButton icon="impersonate" label="Se connecter en tant que ce joueur" />
        <IconButton icon="logout" label="Fermer toutes les sessions" />
        <IconButton icon="trash" label="Supprimer le compte" danger />
      </QuickBar>
    </template>
  </Hero>
</template>
