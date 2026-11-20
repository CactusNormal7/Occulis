<script setup lang="ts">
/**
 * Une chaîne écrite dans l'alphabet cryptique, qui peut se déchiffrer sous les yeux.
 *
 * Chaque caractère est une case qui superpose sa lettre et son glyphe : la largeur est
 * celle du texte dès la première image, et rien ne bouge autour pendant que les glyphes
 * cèdent. Seule l'opacité change (`data-state`).
 *
 * Sous `calm`, les glyphes ne se brouillent plus : chacun cède sa lettre directement. Sous
 * `still` (et `prefers-reduced-motion`), la chaîne passe d'un état à l'autre en un seul
 * fondu. `done` part une fois par animation, à son terme.
 */
import { computed, onMounted, ref, watch } from "vue";
import { PROPOSED } from "../tokens.js";
import { useClock } from "./clock.js";
import {
  cellAt,
  cipherGlyph,
  isGap,
  scrambleGlyph,
  type CellState,
  type CipherAlphabet,
  type GlyphShape,
} from "./glyphs.js";
import { durationMs, readMotion } from "./motion.js";
import type { CipherMode } from "./types.js";
import Glyph from "./Glyph.vue";

const props = withDefaults(
  defineProps<{
    /** Le texte, toujours lu tel quel par un lecteur d'écran — les glyphes ne sont qu'un habit. */
    text: string;
    /**
     * `cipher` et `plain` sont des états fixes ; `decode` part des glyphes et pose les lettres,
     * `encode` fait l'inverse. Changer `playKey` rejoue l'animation.
     */
    mode?: CipherMode | undefined;
    alphabet?: CipherAlphabet | undefined;
    /** Une lettre a toujours le même glyphe (décodable), ou un glyphe tiré au hasard (ornement). */
    decodable?: boolean | undefined;
    /** La durée de rôle de l'animation : `decode` pour un titre, `slow` ou `base` pour un survol. */
    pace?: "decode" | "slow" | "base" | undefined;
    seed?: number | undefined;
    playKey?: unknown;
  }>(),
  { mode: "cipher", alphabet: "lattice", decodable: true, pace: "decode", seed: 0 },
);

const emit = defineEmits<{ done: [] }>();

/** Le rythme d'une animation, relu à chacun de ses départs. */
interface Timing {
  durationMs: number;
  tickMs: number;
  scramble: boolean;
  still: boolean;
}

const chars = computed(() => Array.from(props.text));
const animated = computed(() => props.mode === "decode" || props.mode === "encode");
const runKey = computed(() => `${props.mode}:${String(props.playKey)}`);
const timing = ref<Timing | null>(null);

function startRun() {
  if (!animated.value) {
    timing.value = null;
    return;
  }
  // Le niveau d'intensité est relu à chaque départ : une surcharge posée à chaud vaut pour
  // l'animation suivante.
  const motion = readMotion();
  timing.value = {
    durationMs: durationMs(props.pace, motion),
    tickMs: durationMs("tick", motion),
    scramble: motion.level === "full",
    still: motion.level === "still",
  };
}

// Au montage plutôt qu'à la création : le mouvement se lit sur la page, absente d'un rendu serveur.
onMounted(startRun);
watch([runKey, () => props.pace], startRun);

const elapsed = useClock(() => ({
  running: timing.value !== null && !timing.value.still,
  stepMs: timing.value?.tickMs ?? PROPOSED.duration.tick,
  untilMs: timing.value?.durationMs,
  runKey: runKey.value,
}));

const finished = computed(() => {
  const current = timing.value;
  if (current === null) return false;
  return current.still || (elapsed.value !== null && elapsed.value >= current.durationMs);
});

/** La dernière animation déjà signalée finie : `done` ne part qu'une fois par animation. */
let reportedRun = "";
watch([finished, runKey], ([isFinished, key]) => {
  if (isFinished && reportedRun !== key) {
    reportedRun = key;
    emit("done");
  }
});

function stateOf(index: number): CellState {
  const { mode } = props;
  if (mode === "plain") return { state: "plain" };
  if (mode === "cipher") return { state: "cipher" };
  if (finished.value) return { state: mode === "decode" ? "plain" : "cipher" };
  if (elapsed.value === null || timing.value === null)
    return { state: mode === "decode" ? "cipher" : "plain" };
  return cellAt(
    index,
    chars.value.length,
    elapsed.value,
    { ...timing.value, seed: props.seed },
    mode,
  );
}

interface Cell {
  index: number;
  char: string;
  state: CellState["state"];
  glyph: GlyphShape;
}

/** Les mots du texte, chacun fait de ses cases ; les blancs ne sont que des séparations. */
const words = computed(() => {
  const result: { start: number; cells: Cell[] }[] = [];
  chars.value.forEach((char, index) => {
    if (isGap(char)) return;
    const state = stateOf(index);
    const glyph =
      state.state === "scramble"
        ? scrambleGlyph(index, state.variant, props.alphabet, props.seed)
        : cipherGlyph(char, index, props.alphabet, props.decodable, props.seed);
    const cell = { index, char, state: state.state, glyph };
    const previous = result[result.length - 1];
    if (previous !== undefined && previous.start + previous.cells.length === index)
      previous.cells.push(cell);
    else result.push({ start: index, cells: [cell] });
  });
  return result;
});
</script>

<template>
  <span class="occ-cipher">
    <span class="occ-cipher__sr">{{ text }}</span>
    <span class="occ-cipher__chars" aria-hidden="true">
      <span v-for="(word, position) in words" :key="word.start" class="occ-cipher__word">
        <template v-if="position > 0">{{ " " }}</template>
        <span
          v-for="cell in word.cells"
          :key="cell.index"
          class="occ-cipher__cell"
          :data-state="cell.state"
        >
          <span class="occ-cipher__letter">{{ cell.char }}</span>
          <Glyph :glyph="cell.glyph" />
        </span>
      </span>
    </span>
  </span>
</template>
