<script setup lang="ts">
import { MessageThread } from "@occulis/ui";
</script>

<template>
  <MessageThread :messages="[]" empty="No messages: write the first one." />
</template>
