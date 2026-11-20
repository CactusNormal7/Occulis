<script setup lang="ts">
/** Un chiffre dans une carte : plus petit qu'une `StatTile`, sans cadre. */
defineProps<{
  value: string | number;
  label: string;
}>();
</script>

<template>
  <div class="occ-stat">
    <strong>{{ value }}</strong>
    <span class="occ-label">{{ label }}</span>
  </div>
</template>
