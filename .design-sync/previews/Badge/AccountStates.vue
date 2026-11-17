<script setup lang="ts">
import { Badge } from "@occulis/ui";
</script>

<template>
  <div style="display: flex; gap: 8px; flex-wrap: wrap">
    <Badge tone="strong">admin</Badge>
    <Badge>vérifiée</Badge>
    <Badge tone="dim">non vérifiée</Badge>
    <Badge tone="refused">suspendu</Badge>
  </div>
</template>
