<script setup lang="ts">
import { ToastProvider } from "@occulis/ui";
import ToastTrigger from "./parts/ToastTrigger.vue";
</script>

<template>
  <ToastProvider>
    <ToastTrigger />
  </ToastProvider>
</template>
