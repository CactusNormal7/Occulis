<script setup lang="ts">
/** Le compteur de nulle sans prise, qui ne paraît qu'à l'approche du seuil (`hud/model.ts`). */
import type { DrawMeter } from "./model.js";

defineProps<{ meter: DrawMeter }>();
</script>

<template>
  <dl class="hud-draw" :aria-label="meter.title">
    <dt class="hud-caps hud-caution">{{ meter.title }}</dt>
    <dd class="hud-caution">{{ meter.count }}</dd>
    <dd class="hud-meter"><i :style="{ width: `${meter.share * 100}%` }" /></dd>
    <dd class="hud-draw__rule hud-dim">{{ meter.rule }}</dd>
  </dl>
</template>
