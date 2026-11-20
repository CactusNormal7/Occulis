<script setup lang="ts">
import { Badge, PlayerPlate, Reveal } from "@occulis/ui";
</script>

<template>
  <Reveal compact versus="vs">
    <template #self>
      <PlayerPlate name="Cactus" camp="A" tag="You" :lines="['1232 Elo', '14 played · 9 won']">
        <template #badges><Badge>On a roll</Badge></template>
      </PlayerPlate>
    </template>
    <template #opponent>
      <PlayerPlate name="boris" camp="B" align="end" :lines="['1188 Elo', '3 played · 1 won']">
        <template #badges><Badge>First blood</Badge></template>
      </PlayerPlate>
    </template>
  </Reveal>
</template>
