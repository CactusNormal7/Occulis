<script setup lang="ts">
/** Chantier 3 : l'inversion « papier millimétré ». */
import { ref } from "vue";
import { Badge, Segmented, Stage } from "../../src/index.js";
import CircleDemo from "./CircleDemo.vue";
import ZoneDemo from "./ZoneDemo.vue";

/** La disparition, `--occ-paper-resorb` : la même que dans la barre du haut. */
const resorb = defineModel<string>("resorb", { required: true });

type Blend = "cover" | "invert";

const BLENDS = [
  { value: "cover" as const, label: "Cover (opaque paper)" },
  { value: "invert" as const, label: "Invert what is below" },
];

const DISAPPEARANCES = [
  { value: "dither", label: "Everywhere at once (dither)" },
  { value: "recede", label: "Back to the click" },
  { value: "none", label: "Stays" },
];

const DISAPPEARANCE_NOTES: Record<string, string> = {
  dither:
    "The paper holds, then goes out cell by cell everywhere at once, in an ordered dither — the theme veil's gesture.",
  recede:
    "The paper holds, then the front runs backwards at the same speed and shrinks into the point it came from.",
  none: "The paper stays where it is: an inverted zone that lasts until something replaces it.",
};

const BLEND_NOTES: Record<Blend, string> = {
  cover: "Cover: the paper hides what is below. Safe for colours; usable as a screen transition.",
  invert:
    "Invert: difference blending. Bone text turns black and stays readable, but camp colours flip to their complement — a teal piece would read orange. Not for the board as is.",
};

const blend = ref<Blend>("cover");
</script>

<template>
  <section id="paper" class="occ-lab-section">
    <header>
      <h2 class="occ-label">3 · Graph-paper inversion</h2>
      <p>
        The theme inverts inside a zone — bone becomes the ground, the void a grid of dots — and
        spreads from a point. Drawn by a WebGL fragment shader on a decorative overlay: per frame it
        receives a handful of numbers, nothing touches layout. Speed, grid, dot size and resorption
        are tokens (bar above); hold and resorb durations follow the tempo.
      </p>
    </header>
    <div class="occ-lab-row">
      <Segmented v-model="blend" label="Blend" :options="BLENDS" />
      <Segmented v-model="resorb" label="Disappearance" :options="DISAPPEARANCES" />
    </div>
    <p class="occ-lab-note">{{ DISAPPEARANCE_NOTES[resorb] ?? "" }}</p>
    <p class="occ-lab-note">{{ BLEND_NOTES[blend] }}</p>
    <Stage title="Circular propagation">
      <CircleDemo :blend="blend" />
    </Stage>
    <Stage title="Following a board zone · click a lit tile">
      <template #actions>
        <Badge tone="dim">Zone = what camp A sees</Badge>
      </template>
      <ZoneDemo :blend="blend" />
    </Stage>
  </section>
</template>
