<script setup lang="ts">
/**
 * Une frise de glyphes sans texte : un ornement de bordure, de chargement ou de couronne.
 * Entièrement `aria-hidden` — elle ne dit rien et ne doit jamais rien dire.
 */
import { onMounted, ref, watch } from "vue";
import { PROPOSED } from "../tokens.js";
import { useClock } from "./clock.js";
import { flickerVariant, scrambleGlyph, type CipherAlphabet } from "./glyphs.js";
import { readMotion } from "./motion.js";
import Glyph from "./Glyph.vue";

const props = withDefaults(
  defineProps<{
    /** Le nombre de glyphes de la frise. */
    count: number;
    alphabet?: CipherAlphabet | undefined;
    seed?: number | undefined;
    /** Les glyphes frémissent un à un, si le niveau d'intensité laisse tourner les boucles. */
    live?: boolean | undefined;
    /** `row` pour un bandeau ou une bordure, `ring` pour une couronne autour d'un centre. */
    layout?: "row" | "ring" | undefined;
  }>(),
  { alphabet: "lattice", seed: 0, live: false, layout: "row" },
);

const running = ref(false);
const flickerMs = ref<number>(PROPOSED.cipher.flicker);

function readLoop() {
  const motion = readMotion();
  running.value = props.live && motion.level === "full";
  flickerMs.value = PROPOSED.cipher.flicker * motion.tempo;
}

onMounted(readLoop);
watch(() => props.live, readLoop);

const elapsed = useClock(() => ({
  running: running.value,
  stepMs: flickerMs.value / 2,
  runKey: `frieze:${props.seed}`,
}));

function glyphAt(index: number) {
  const variant = running.value
    ? flickerVariant(index, props.count, elapsed.value ?? 0, flickerMs.value, props.seed)
    : 0;
  return scrambleGlyph(index, variant, props.alphabet, props.seed);
}
</script>

<template>
  <span
    :class="['occ-frieze', `occ-frieze--${layout}`]"
    aria-hidden="true"
    :style="{ '--frieze-count': count }"
  >
    <span
      v-for="index in count"
      :key="index"
      class="occ-frieze__cell"
      :style="{ '--frieze-index': index - 1 }"
    >
      <Glyph :glyph="glyphAt(index - 1)" />
    </span>
  </span>
</template>
