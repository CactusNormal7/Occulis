<script setup lang="ts">
import { IconButton } from "@occulis/ui";
</script>

<template>
  <div style="display: flex; gap: 2px">
    <IconButton icon="first" label="Position de départ" />
    <IconButton icon="previous" label="Coup précédent" />
    <IconButton icon="play" label="Lire la partie" />
    <IconButton icon="next" label="Coup suivant" />
    <IconButton icon="last" label="Dernière position" />
  </div>
</template>
