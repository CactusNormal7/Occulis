<script setup lang="ts">
import { Stat } from "@occulis/ui";
</script>

<template>
  <div style="display: flex; gap: 48px">
    <Stat :value="18" label="parties" />
    <Stat value="61 %" label="taux" />
    <Stat :value="1200" label="ELO" />
  </div>
</template>
