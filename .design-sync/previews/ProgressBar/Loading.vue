<script setup lang="ts">
import { ProgressBar } from "@occulis/ui";
</script>

<template>
  <div style="position: relative; height: 40px; transform: translateZ(0)">
    <ProgressBar active />
    <p class="occ-muted" style="margin: 12px 0 0">chargement de la partie…</p>
  </div>
</template>
