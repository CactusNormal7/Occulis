<script setup lang="ts">
/**
 * L'écran de fin d'une partie jouée. Il ne paraît qu'une fois sa lecture arrivée : la racine
 * la lance avant de le montrer, et la frontière d'attente couvre le reste.
 */
import { ProgressBar } from "@occulis/ui";
import DebriefView from "./DebriefView.vue";

defineProps<{ matchId: string }>();

const emit = defineEmits<{ playAgain: []; menu: [] }>();
</script>

<template>
  <Suspense>
    <DebriefView :match-id="matchId" @play-again="emit('playAgain')" @menu="emit('menu')" />
    <template #fallback>
      <ProgressBar active />
    </template>
  </Suspense>
</template>
