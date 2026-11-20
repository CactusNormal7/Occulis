<script setup lang="ts">
import { ref } from "vue";
import { PasswordField } from "@occulis/ui";

const password = ref("");
</script>

<template>
  <div style="max-width: 360px">
    <PasswordField
      v-model="password"
      label="New password"
      name="password"
      autocomplete="new-password"
      hint="At least 10 characters. Passwords found in known leaks are refused."
    />
  </div>
</template>
