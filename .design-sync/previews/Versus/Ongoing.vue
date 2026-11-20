<script setup lang="ts">
import { Badge, Versus } from "@occulis/ui";
</script>

<template>
  <Versus :a="{ name: 'Cactus', href: '#' }" :b="{ name: 'pseudo2', href: '#' }">
    <template #end><Badge tone="dim">en cours</Badge></template>
  </Versus>
</template>
