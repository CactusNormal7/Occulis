<script setup lang="ts">
/** Chantier 1 : les tokens proposés, montrés par leur effet. */
import { ref } from "vue";
import { Button, CodeBlock, Specimen, Stage } from "../../src/index.js";
import { MOTION_LEVEL_NAMES, PROPOSED, type MotionLevel } from "../../src/tokens.js";
import TokenTrack from "./TokenTrack.vue";

const OVERRIDE_EXAMPLE = `// Globally, or for one account: only knobs and roles, on the root.
const root = document.documentElement;
root.dataset.motion = "calm";                  // full | calm | still
root.style.setProperty("--occ-tempo", "1.5");  // every --occ-dur-* follows
root.style.setProperty("--occ-paper-speed", "600");

// A JavaScript animation never reads a literal duration:
const motion = readMotion();                   // @occulis/ui/lab
const ms = durationMs("decode", motion);       // 900 × tempo`;

/** Les courbes, sous leur nom CSS et leur clé dans `PROPOSED.easing`. */
const EASINGS = [
  { css: "out", value: PROPOSED.easing.out },
  { css: "in", value: PROPOSED.easing.in },
  { css: "in-out", value: PROPOSED.easing.inOut },
  { css: "sweep", value: PROPOSED.easing.sweep },
];

const LEVEL_NOTES: Record<MotionLevel, string> = {
  full: "Everything: arcs, trails, scrambling glyphs, looping ornaments.",
  calm: "Shorter distances, no trail, no loop; glyphs yield their letter without scrambling.",
  still: "Nothing travels; changes cross-fade. Forced by prefers-reduced-motion.",
};

const durations = Object.entries(PROPOSED.duration).filter(([name]) => name !== "breath");
const run = ref(false);

function levelValue(level: MotionLevel): string {
  const { amplitude, loop, scramble } = PROPOSED.motion[level];
  return `amplitude ${amplitude} · loops ${loop} · scramble ${scramble ? "yes" : "no"}`;
}
</script>

<template>
  <section id="tokens" class="occ-lab-section">
    <header>
      <h2 class="occ-label">1 · Tokens and motion</h2>
      <p>
        Three layers: values (tokens.ts), roles (--occ-dur-window, --occ-paper…) that stylesheets
        read, and three knobs (--occ-tempo, --occ-motion-amplitude, --occ-motion-loop) that a
        runtime override sets on the root. Use the bar above to try them: every demo on this page
        reads them when it starts.
      </p>
    </header>
    <Stage title="Durations · ease-out">
      <template #actions>
        <Button size="sm" icon="play" @click="run = !run">{{ run ? "Back" : "Play" }}</Button>
      </template>
      <div class="occ-lab-grid">
        <Specimen
          v-for="[name, ms] in durations"
          :key="name"
          :name="`--occ-dur-${name}`"
          :value="`${ms}ms`"
        >
          <TokenTrack
            :duration="`var(--occ-dur-${name})`"
            easing="var(--occ-ease-out)"
            :run="run"
          />
        </Specimen>
      </div>
    </Stage>
    <Stage title="Easings · over --occ-dur-slow">
      <div class="occ-lab-grid">
        <Specimen
          v-for="easing in EASINGS"
          :key="easing.css"
          :name="`--occ-ease-${easing.css}`"
          :value="easing.value"
        >
          <TokenTrack
            duration="var(--occ-dur-slow)"
            :easing="`var(--occ-ease-${easing.css})`"
            :run="run"
          />
        </Specimen>
      </div>
    </Stage>
    <Stage title="Intensity levels">
      <div class="occ-lab-grid">
        <Specimen
          v-for="level in MOTION_LEVEL_NAMES"
          :key="level"
          :name="`data-motion=&quot;${level}&quot;`"
          :value="levelValue(level)"
        >
          <span class="occ-lab-note">{{ LEVEL_NOTES[level] }}</span>
        </Specimen>
      </div>
    </Stage>
    <Stage title="Distances · × amplitude">
      <div class="occ-lab-grid">
        <Specimen
          v-for="(px, name) in PROPOSED.distance"
          :key="name"
          :name="`--occ-dist-${name}`"
          :value="`${px}px`"
        >
          <span class="occ-lab-note">{{ name }}</span>
        </Specimen>
      </div>
    </Stage>
    <CodeBlock label="Runtime override — what the back-office will do" :code="OVERRIDE_EXAMPLE" />
  </section>
</template>
