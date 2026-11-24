<script setup lang="ts">
import { CountdownRing } from "@occulis/ui";
</script>

<template>
  <CountdownRing size="lg" :total-ms="90000" :remaining-ms="54000" label="Time left">54</CountdownRing>
</template>
