<script setup lang="ts">
/**
 * L'ouverture des fenêtres : un panneau qui s'ouvre depuis le centre ou depuis le pointeur,
 * une annonce et une fenêtre modale, toutes au ralenti des retouches.
 */
import { computed, nextTick, ref, useTemplateRef } from "vue";
import {
  Button,
  Card,
  Dialog,
  Note,
  Stage,
  revealWindow,
  useMessages,
  useToast,
} from "@occulis/ui";
import { useTweaks } from "../tweaks-context.js";

type Origin = "center" | "pointer";

const messages = useMessages();
const text = computed(() => messages.value.admin.design.motion.windows);
const tweaks = useTweaks();
const notify = useToast();

const panel = useTemplateRef<HTMLDivElement>("panel");
const shown = ref(false);
const dialogOpen = ref(false);
/** D'où le panneau s'est ouvert : il se referme vers le même point. */
let origin: Origin = "center";

async function open(from: Origin) {
  origin = from;
  shown.value = true;
  // Le panneau doit être visible pour que l'animation mesure sa boîte.
  await nextTick();
  if (panel.value !== null) void revealWindow(panel.value, "open", from, { speed: tweaks.speed });
}

async function close() {
  if (panel.value === null) return;
  await revealWindow(panel.value, "close", origin, { speed: tweaks.speed });
  shown.value = false;
}
</script>

<template>
  <Card :title="text.title">
    <Note>{{ text.text }}</Note>
    <Stage>
      <template #actions>
        <Button size="sm" @click="open('center')">{{ text.fromCenter }}</Button>
        <Button size="sm" @click="open('pointer')">{{ text.fromPointer }}</Button>
        <Button size="sm" variant="ghost" :disabled="!shown" @click="close">{{
          text.close
        }}</Button>
        <Button size="sm" variant="ghost" @click="notify(text.toastText)">{{ text.toast }}</Button>
        <Button size="sm" variant="ghost" @click="dialogOpen = true">{{ text.dialog }}</Button>
      </template>
      <div ref="panel" :hidden="!shown" style="max-width: 360px">
        <Card :title="text.sampleTitle">
          <Note>{{ text.sampleText }}</Note>
        </Card>
      </div>
    </Stage>
    <Dialog
      :open="dialogOpen"
      :title="text.dialogTitle"
      :confirm-label="text.close"
      @confirm="() => true"
      @close="dialogOpen = false"
    >
      <Note>{{ text.dialogText }}</Note>
    </Dialog>
  </Card>
</template>
