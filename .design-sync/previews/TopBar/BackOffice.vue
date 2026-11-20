<script setup lang="ts">
import { TopBar } from "@occulis/ui";

const tabs = [
  { href: "#", label: "Vue d'ensemble" },
  { href: "#", label: "Comptes", current: true },
  { href: "#", label: "Parties" },
];
</script>

<template>
  <TopBar section="back-office" brand-href="#" :tabs="tabs">
    <template #end>
      <span>Cactus</span>
      <a href="#">retour au jeu →</a>
    </template>
  </TopBar>
</template>
