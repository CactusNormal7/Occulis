<script setup lang="ts">
/** Une piste où un point traverse, sur la durée et la courbe données : un token montré par son effet. */
defineProps<{ duration: string; easing: string; run: boolean }>();
</script>

<template>
  <div class="occ-lab-track" :data-run="run">
    <span :style="{ transitionDuration: duration, transitionTimingFunction: easing }" />
  </div>
</template>
