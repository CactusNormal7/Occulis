<script setup lang="ts">
import { ref } from "vue";
import { TextField } from "@occulis/ui";

const handle = ref("");
</script>

<template>
  <div style="max-width: 360px">
    <TextField
      v-model="handle"
      label="Pseudo"
      placeholder="entre 2 et 32 caractères"
      hint="Visible par votre adversaire en partie."
    />
  </div>
</template>
