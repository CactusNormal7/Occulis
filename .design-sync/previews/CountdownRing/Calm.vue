<script setup lang="ts">
import { CountdownRing } from "@occulis/ui";
</script>

<template>
  <CountdownRing :total-ms="15000" :remaining-ms="11000" label="Time left">11</CountdownRing>
</template>
