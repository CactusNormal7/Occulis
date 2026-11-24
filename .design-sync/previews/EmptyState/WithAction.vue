<script setup lang="ts">
import { Button, EmptyState } from "@occulis/ui";
</script>

<template>
  <EmptyState>
    Vous incarnez anne.
    <template #action>
      <Button variant="primary">Revenir à mon compte</Button>
    </template>
  </EmptyState>
</template>
