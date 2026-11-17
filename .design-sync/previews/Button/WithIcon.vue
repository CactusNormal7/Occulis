<script setup lang="ts">
import { Button } from "@occulis/ui";
</script>

<template>
  <div style="display: flex; gap: 12px; flex-wrap: wrap">
    <Button icon="plus">Nouveau compte</Button>
    <Button icon="logout" size="sm">Tout fermer</Button>
    <Button variant="danger" icon="trash">Supprimer</Button>
  </div>
</template>
