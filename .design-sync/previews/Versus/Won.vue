<script setup lang="ts">
import { Badge, Versus } from "@occulis/ui";
</script>

<template>
  <Versus :a="{ name: 'anne', href: '#' }" :b="{ name: 'bruno', href: '#' }">
    <template #end><Badge tone="B">victoire de bruno (abandon)</Badge></template>
  </Versus>
</template>
