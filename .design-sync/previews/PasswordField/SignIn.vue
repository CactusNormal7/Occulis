<script setup lang="ts">
import { ref } from "vue";
import { PasswordField } from "@occulis/ui";

const password = ref("correct-horse-battery");
</script>

<template>
  <div style="max-width: 360px">
    <PasswordField v-model="password" label="Password" name="password" autocomplete="current-password" />
  </div>
</template>
