<script setup lang="ts">
import { Button, Stage } from "@occulis/ui";
</script>

<template>
  <Stage title="Variants">
    <template #actions>
      <Button size="sm" variant="ghost">Code</Button>
    </template>
    <Button variant="primary">Play</Button>
  </Stage>
</template>
