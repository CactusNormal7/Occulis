<script setup lang="ts">
/**
 * Les boutons de caméra, à gauche (`view/camera.ts`). En tête, la bascule de la vue de
 * dessus, que la barre d'espace actionne aussi ; dessous, les gestes des flèches et de la
 * molette, éteints tant que la vue de dessus fige la caméra.
 */
import { computed } from "vue";
import { useMessages } from "@occulis/ui";
import type { CameraCommand } from "../view/camera.js";
import HudIcon from "./HudIcon.vue";
import type { HudIconName } from "./icons.js";

defineProps<{ planView: boolean }>();
const emit = defineEmits<{ command: [command: CameraCommand] }>();

const messages = useMessages();
const t = computed(() => messages.value.game.hud.camera);

const BUTTONS: readonly {
  command: CameraCommand;
  icon: HudIconName;
  label: keyof typeof t.value;
}[] = [
  { command: "turn-left", icon: "turnLeft", label: "left" },
  { command: "turn-right", icon: "turnRight", label: "right" },
  { command: "zoom-in", icon: "zoomIn", label: "zoomIn" },
  { command: "zoom-out", icon: "zoomOut", label: "zoomOut" },
  { command: "recenter", icon: "recenter", label: "center" },
];
</script>

<template>
  <div class="hud-camera" role="group" :aria-label="t.label">
    <button
      class="hud-button hud-button--icon"
      type="button"
      :aria-pressed="planView"
      :aria-label="planView ? t.leavePlan : t.plan"
      :title="planView ? t.leavePlan : t.plan"
      @click="emit('command', 'plan-view')"
    >
      <HudIcon name="planView" />
    </button>
    <kbd class="hud-camera__key" aria-hidden="true">␣</kbd>
    <button
      v-for="button in BUTTONS"
      :key="button.command"
      class="hud-button hud-button--icon"
      type="button"
      :aria-label="t[button.label]"
      :title="t[button.label]"
      :disabled="planView"
      @click="emit('command', button.command)"
    >
      <HudIcon :name="button.icon" />
    </button>
  </div>
</template>
