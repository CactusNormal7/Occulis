<script setup lang="ts">
/** Ce qui annonce un message : un composant sous `ToastProvider`, qui le reçoit par `useToast`. */
import { Button, useToast } from "@occulis/ui";

const notify = useToast();
</script>

<template>
  <div style="display: flex; gap: 12px">
    <Button @click="notify('Sessions fermées.')">Fermer les sessions</Button>
    <Button variant="danger" @click="notify('Action réservée aux administrateurs.', false)">Supprimer</Button>
  </div>
</template>
