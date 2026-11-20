<script setup lang="ts">
import { Badge, PlayerPlate } from "@occulis/ui";
</script>

<template>
  <PlayerPlate name="Cactus" camp="A" tag="You" :lines="['1232 Elo', '14 played · 9 won']">
    <template #badges><Badge>On a roll</Badge></template>
  </PlayerPlate>
</template>
