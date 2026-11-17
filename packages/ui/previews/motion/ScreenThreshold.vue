<script setup lang="ts">
/** Prototype 2 : le passage d'un écran à l'autre sous le papier. */
import { ref, shallowRef, useTemplateRef } from "vue";
import { Badge, Button, CountdownRing, PlayerPlate, Stage } from "../../src/index.js";
import { CipherText, PaperInversion, type PaperRun } from "../../src/lab/index.js";

const screen = ref<"found" | "deploy">("found");
const run = shallowRef<PaperRun | null>(null);
const decode = ref(0);
const frame = useTemplateRef<HTMLDivElement>("frame");

function accept(event: MouseEvent) {
  const box = frame.value?.getBoundingClientRect();
  if (box === undefined) return;
  const button = (event.currentTarget as HTMLElement).getBoundingClientRect();
  // Le papier part du bouton : le geste dit d'où vient le changement d'écran.
  run.value = {
    key: Date.now(),
    source: {
      kind: "point",
      x: button.left + button.width / 2 - box.left,
      y: button.top + button.height / 2 - box.top,
    },
  };
}

/** Le papier couvre le cadre : l'écran change dessous, d'un bloc, et le titre se décode. */
function covered() {
  screen.value = "deploy";
  decode.value += 1;
}
</script>

<template>
  <Stage title="Prototype 2 · Screen threshold — match found → deployment">
    <template #actions>
      <Button size="sm" variant="ghost" @click="screen = 'found'">Reset</Button>
    </template>
    <p class="occ-lab-note">
      The paper spreads from the button that was pressed, covers the frame, the screen swaps
      underneath in one piece, then the paper resorbs in an ordered dither — the same vocabulary as
      the theme veil, without touching it. The new title arrives as glyphs and decodes. Still: one
      cross-fade.
    </p>
    <div ref="frame" class="occ-lab-screen">
      <div v-if="screen === 'found'" class="occ-lab-screen__content">
        <span class="occ-label">Match found</span>
        <div class="occ-lab-row">
          <PlayerPlate name="Cactus" camp="A" tag="You" :lines="['1232 Elo']" />
          <span class="occ-label">vs</span>
          <PlayerPlate name="boris" camp="B" align="end" :lines="['1188 Elo']" />
        </div>
        <Button variant="primary" @click="accept">Accept</Button>
      </div>
      <div v-else class="occ-lab-screen__content">
        <span class="occ-lab-display">
          <CipherText text="Deployment" mode="decode" :play-key="decode" />
        </span>
        <CountdownRing :total-ms="90000" :remaining-ms="90000" size="lg" label="Time left"
          >90</CountdownRing
        >
        <Badge tone="dim">1 king · 3 abilities · 2 pawns</Badge>
      </div>
      <PaperInversion :run="run" @covered="covered" />
    </div>
  </Stage>
</template>
