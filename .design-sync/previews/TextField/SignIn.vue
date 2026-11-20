<script setup lang="ts">
import { ref } from "vue";
import { TextField } from "@occulis/ui";

const email = ref("anne@occulis.test");
const password = ref("un-mot-de-passe");
</script>

<template>
  <div style="display: grid; gap: 14px; max-width: 360px">
    <TextField v-model="email" label="Adresse électronique" type="email" />
    <TextField v-model="password" label="Mot de passe" type="password" />
  </div>
</template>
