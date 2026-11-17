<script setup lang="ts">
import { ICON_NAMES, Icon } from "@occulis/ui";
</script>

<template>
  <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 16px; padding: 8px">
    <div v-for="name in ICON_NAMES" :key="name" style="display: flex; align-items: center; gap: 8px">
      <Icon :name="name" :size="20" />
      <span class="occ-muted">{{ name }}</span>
    </div>
  </div>
</template>
