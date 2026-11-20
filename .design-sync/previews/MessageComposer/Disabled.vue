<script setup lang="ts">
import { MessageComposer } from "@occulis/ui";

const send = async () => false;
</script>

<template>
  <MessageComposer :on-send="send" disabled placeholder="Impersonation session: read-only" />
</template>
