<script setup lang="ts">
/**
 * Les équipes préparées, depuis le menu : la liste, et l'éditeur qui reprend le
 * constructeur du déploiement. Une équipe se prépare pour la carte et le ruleset des
 * nouvelles parties, dans la zone du camp A — elle sera transposée au camp réellement
 * tenu (`prepare/model.ts`, `presetTeam()`).
 */
import { ProgressBar, ToastProvider } from "@occulis/ui";
import TeamsList from "./TeamsList.vue";

const emit = defineEmits<{ back: [] }>();
</script>

<template>
  <ToastProvider>
    <!-- Les équipes sont préchargées dès le menu : en temps normal, rien n'attend ici. -->
    <Suspense>
      <TeamsList @back="emit('back')" />
      <template #fallback>
        <ProgressBar active />
      </template>
    </Suspense>
  </ToastProvider>
</template>
