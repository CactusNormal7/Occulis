<script setup lang="ts">
import { ToastStack } from "@occulis/ui";

const messages = [
  { id: 1, text: "Pseudo changé, sur le compte et sur le profil de jeu.", ok: true },
  { id: 2, text: "Ce pseudo est déjà pris.", ok: false },
];
</script>

<template>
  <div style="position: relative; height: 160px; transform: translateZ(0)">
    <ToastStack :messages="messages" />
  </div>
</template>
