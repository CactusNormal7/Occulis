<script setup lang="ts">
import { Button, FormMessage } from "@occulis/ui";
</script>

<template>
  <div style="max-width: 380px">
    <FormMessage tone="info">
      Confirm your address to open the queue.
      <template #action>
        <Button size="sm">Resend</Button>
      </template>
    </FormMessage>
  </div>
</template>
