<script setup lang="ts">
/** Les durées du plateau, et ses courbes tracées avec un point qui les parcourt. */
import { computed, ref } from "vue";
import { Button, Card, Note, Specimen, Stage, Table, useMessages } from "@occulis/ui";
import { easeInOutSine, easeOutBack, easeOutCubic } from "../../../view/easing.js";
import { useTweaks } from "../tweaks-context.js";
import { BOARD_MOTION } from "../sources.js";
import EasingCurve from "./EasingCurve.vue";

const CURVES = [
  ["easeOutCubic", easeOutCubic],
  ["easeInOutSine", easeInOutSine],
  ["easeOutBack", (t: number) => easeOutBack(t)],
] as const;

/** La durée d'un parcours, en temps réel. */
const CURVE_MS = 900;

const messages = useMessages();
const text = computed(() => messages.value.admin.design.motion);
const tweaks = useTweaks();
/** L'avancée du point sur les courbes, de 0 à 1. */
const progress = ref(1);

function play() {
  const start = performance.now();
  const step = (now: number) => {
    progress.value = Math.min(1, ((now - start) * tweaks.speed) / CURVE_MS);
    if (progress.value < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
</script>

<template>
  <Card :title="text.board.title">
    <Note>{{ text.board.text }}</Note>
    <Stage :title="text.board.curves">
      <template #actions>
        <Button size="sm" icon="play" @click="play">{{ text.board.replay }}</Button>
      </template>
      <Specimen
        v-for="[name, curve] in CURVES"
        :key="name"
        :name="name"
        value="apps/web/src/view/easing.ts"
      >
        <EasingCurve :curve="curve" :progress="progress" />
      </Specimen>
    </Stage>
    <Table
      :columns="[text.columns.key, text.columns.value, text.columns.note]"
      :row-count="BOARD_MOTION.length"
    >
      <tr v-for="field in BOARD_MOTION" :key="field.key">
        <td>
          <code>{{ field.key }}</code>
        </td>
        <td>
          <code>{{ field.value }}</code>
        </td>
        <td>{{ field.note }}</td>
      </tr>
    </Table>
  </Card>
</template>
