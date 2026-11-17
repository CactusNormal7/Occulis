<script setup lang="ts">
import { Button, Card, UiRoot } from "@occulis/ui";
</script>

<template>
  <UiRoot style="padding: 24px">
    <Card title="Partie rapide">
      <p style="margin: 0">Le premier adversaire disponible, sur la carte du moment.</p>
      <div>
        <Button variant="primary">Jouer</Button>
      </div>
    </Card>
  </UiRoot>
</template>
