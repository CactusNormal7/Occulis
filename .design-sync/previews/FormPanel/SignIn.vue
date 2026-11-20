<script setup lang="ts">
import { ref } from "vue";
import { Button, Divider, FormPanel, PasswordField, ProviderButton, TextField } from "@occulis/ui";

const email = ref("anne@occulis.test");
const password = ref("");
</script>

<template>
  <div style="padding: 32px 16px">
    <FormPanel title="Sign in" lead="Turn-based tactics where you only see what your pieces see.">
      <ProviderButton provider="google" />
      <Divider>or</Divider>
      <form style="display: grid; gap: 14px" @submit.prevent>
        <TextField v-model="email" label="Email address" type="email" name="email" autocomplete="username" />
        <PasswordField v-model="password" label="Password" name="password" autocomplete="current-password" />
        <Button type="submit" variant="primary">Sign in</Button>
      </form>
      <template #footer>
        <a href="#forgot">Forgot your password?</a>
        <span>No account yet? <a href="#register">Create an account</a></span>
      </template>
    </FormPanel>
  </div>
</template>
