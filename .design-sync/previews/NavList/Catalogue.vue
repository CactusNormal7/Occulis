<script setup lang="ts">
import { NavList } from "@occulis/ui";

const sections = [
  {
    label: "Actions",
    items: [
      { href: "#button", label: "Button", current: true },
      { href: "#icon-button", label: "IconButton" },
    ],
  },
  {
    label: "Forms",
    items: [
      { href: "#text-field", label: "TextField" },
      { href: "#segmented", label: "Segmented" },
    ],
  },
];
</script>

<template>
  <NavList label="Components" :sections="sections" />
</template>
