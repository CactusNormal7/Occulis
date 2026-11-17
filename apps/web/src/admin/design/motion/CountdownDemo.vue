<script setup lang="ts">
/** L'anneau du compte à rebours, qui s'écoule au rythme des retouches. */
import { computed, ref, watchEffect } from "vue";
import { Button, Card, CountdownRing, Stage, useMessages } from "@occulis/ui";
import { useTweaks } from "../tweaks-context.js";

const COUNTDOWN_MS = 15_000;
const TICK_MS = 1000;

const messages = useMessages();
const text = computed(() => messages.value.admin.design.motion.animated);
const tweaks = useTweaks();
const remaining = ref(COUNTDOWN_MS);

watchEffect((onCleanup) => {
  const tick = window.setInterval(() => {
    remaining.value = Math.max(0, remaining.value - TICK_MS);
  }, TICK_MS / tweaks.speed);
  onCleanup(() => window.clearInterval(tick));
});
</script>

<template>
  <Card :title="text.countdown">
    <template #action>
      <Button size="sm" icon="play" @click="remaining = COUNTDOWN_MS">{{ text.restart }}</Button>
    </template>
    <Stage>
      <CountdownRing :total-ms="COUNTDOWN_MS" :remaining-ms="remaining" :label="text.countdown">
        {{ Math.ceil(remaining / 1000) }}
      </CountdownRing>
    </Stage>
  </Card>
</template>
