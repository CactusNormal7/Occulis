<script setup lang="ts">
/** Prototype 3 : l'attente d'un adversaire. */
import { computed, ref, watch } from "vue";
import { Button, Stage } from "../../src/index.js";
import { CipherFrieze, CipherText } from "../../src/lab/index.js";

const state = ref<"idle" | "searching" | "found">("idle");
const seconds = ref(0);
const found = ref(0);

// Le temps d'attente est une information : il est compté au fil des secondes, jamais animé.
watch(state, (current, _previous, onCleanup) => {
  if (current !== "searching") return;
  seconds.value = 0;
  const timer = window.setInterval(() => (seconds.value += 1), 1000);
  onCleanup(() => window.clearInterval(timer));
});

const elapsed = computed(
  () => `${Math.floor(seconds.value / 60)}:${String(seconds.value % 60).padStart(2, "0")}`,
);

function simulateMatch() {
  state.value = "found";
  found.value += 1;
}
</script>

<template>
  <Stage title="Prototype 3 · Waiting for an opponent">
    <template #actions>
      <Button size="sm" icon="search" @click="state = 'searching'">Search</Button>
      <Button size="sm" :disabled="state !== 'searching'" @click="simulateMatch"
        >Simulate match</Button
      >
      <Button size="sm" variant="ghost" @click="state = 'idle'">Reset</Button>
    </template>
    <p class="occ-lab-note">
      A crown of glyphs turns very slowly around a breathing eye; one glyph shifts now and then. The
      elapsed time stays plain text. When an opponent is found the crown closes into the eye and the
      status decodes. Calm and still: the crown stands still.
    </p>
    <div class="occ-lab-screen">
      <div class="occ-lab-screen__content">
        <div class="occ-lab-queue" :data-found="state === 'found'">
          <CipherFrieze
            v-if="state !== 'idle'"
            :key="state"
            :count="16"
            layout="ring"
            :live="state === 'searching'"
            :seed="9"
          />
          <span class="occ-lab-eye" aria-hidden="true" />
        </div>
        <span class="occ-label">
          <template v-if="state === 'idle'">Ready</template>
          <CipherText v-else-if="state === 'searching'" text="Searching" mode="plain" />
          <CipherText v-else text="Opponent found · boris" mode="decode" :play-key="found" />
        </span>
        <span v-if="state === 'searching'" class="occ-lab-note">{{ elapsed }}</span>
      </div>
    </div>
  </Stage>
</template>
