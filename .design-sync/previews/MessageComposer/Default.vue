<script setup lang="ts">
import { MessageComposer } from "@occulis/ui";

/** L'envoi réussit toujours : l'aperçu ne parle à aucun serveur. */
const send = async () => true;
</script>

<template>
  <MessageComposer :on-send="send" :maxlength="500" />
</template>
