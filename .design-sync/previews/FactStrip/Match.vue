<script setup lang="ts">
import { FactStrip } from "@occulis/ui";

const facts = [
  { label: "début", value: "2026-10-02 18:16" },
  { label: "règles", value: "provisional-0" },
  { label: "carte", value: "demo-0" },
  { label: "coups", value: "11" },
];
</script>

<template>
  <FactStrip :facts="facts" />
</template>
