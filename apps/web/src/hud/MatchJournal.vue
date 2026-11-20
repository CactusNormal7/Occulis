<script setup lang="ts">
/**
 * Le journal des coups, tels que le joueur les a vus : le dernier en clair, ceux qu'il n'a
 * pas vus effacés, et le coup à venir en pointillés. Les plus récents restent en bas, les
 * plus anciens sortent par le haut.
 */
import { computed } from "vue";
import { useMessages } from "@occulis/ui";
import type { DrawMeter as DrawMeterModel, JournalLine } from "./model.js";
import DrawMeter from "./DrawMeter.vue";

defineProps<{ lines: readonly JournalLine[]; drawMeter: DrawMeterModel | undefined }>();

const messages = useMessages();
const t = computed(() => messages.value.game.hud);
</script>

<template>
  <section class="hud-log hud-panel" :aria-label="t.journal">
    <h2 class="hud-log__title hud-caps hud-dim">{{ t.journal }}</h2>
    <ol class="hud-journal">
      <li
        v-for="line in lines"
        :key="line.turn"
        :data-hidden="line.hidden ? '' : undefined"
        :data-last="line.last ? '' : undefined"
        :data-upcoming="line.upcoming ? '' : undefined"
      >
        <span>{{ line.turn }}</span>
        <span class="hud-pip" :class="`hud-camp-${line.camp}`" />
        <span>{{ line.text }}</span>
      </li>
    </ol>
    <DrawMeter v-if="drawMeter !== undefined" :meter="drawMeter" />
  </section>
</template>
