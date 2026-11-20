<script setup lang="ts">
import { CountdownRing } from "@occulis/ui";
</script>

<template>
  <CountdownRing :total-ms="15000" :remaining-ms="3000" label="Time left">3</CountdownRing>
</template>
