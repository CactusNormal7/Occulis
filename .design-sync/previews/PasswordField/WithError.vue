<script setup lang="ts">
import { ref } from "vue";
import { PasswordField } from "@occulis/ui";

const password = ref("password1");
</script>

<template>
  <div style="max-width: 360px">
    <PasswordField
      v-model="password"
      label="Password"
      name="password"
      autocomplete="new-password"
      error="This password appears in known leaks: choose another one."
    />
  </div>
</template>
