<script setup lang="ts">
/** Les durées et la courbe de la charte, chacune sur un point qui traverse sa piste. */
import { computed, ref } from "vue";
import { Button, Card, Specimen, useMessages } from "@occulis/ui";
import { MOTION } from "@occulis/ui/tokens";

const DURATIONS = [
  ["--occ-fast", MOTION.fast],
  ["--occ-base", MOTION.base],
  ["--occ-slow", MOTION.slow],
] as const;

const messages = useMessages();
const text = computed(() => messages.value.admin.design.foundations);
/** Le point est-il au bout de sa piste ? Chaque appui le renvoie de l'autre côté. */
const moved = ref(false);
</script>

<template>
  <Card :title="text.motion">
    <template #action>
      <Button size="sm" icon="play" @click="moved = !moved">{{ text.replay }}</Button>
    </template>
    <Specimen v-for="[name, value] in DURATIONS" :key="name" :name="name" :value="value">
      <span
        style="
          display: block;
          width: 100%;
          height: 8px;
          border-bottom: 1px solid var(--occ-ink-line);
          container-type: inline-size;
        "
      >
        <span
          :style="{
            display: 'block',
            width: '8px',
            height: '8px',
            background: 'var(--occ-ink)',
            transform: moved ? 'translateX(calc(100cqw - 8px))' : 'translateX(0)',
            transition: `transform var(${name}) var(--occ-ease)`,
          }"
        />
      </span>
    </Specimen>
    <Specimen name="--occ-ease" :value="MOTION.ease"><span /></Specimen>
    <Specimen name="--occ-breath" :value="MOTION.breath"><span /></Specimen>
  </Card>
</template>
