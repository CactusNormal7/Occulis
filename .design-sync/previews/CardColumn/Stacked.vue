<script setup lang="ts">
import { Card, CardColumn, CardGrid, EmptyState } from "@occulis/ui";
</script>

<template>
  <CardGrid>
    <CardColumn>
      <Card title="Profil de jeu">
        <EmptyState>Aucun profil lié.</EmptyState>
      </Card>
      <Card title="Dernières parties">
        <EmptyState>Aucune partie.</EmptyState>
      </Card>
    </CardColumn>
    <Card title="Modifier">
      <p class="occ-muted" style="margin: 0">pseudo, adresse, mot de passe</p>
    </Card>
  </CardGrid>
</template>
