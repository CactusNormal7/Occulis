<script setup lang="ts">
/**
 * La page du labo de la refonte : chaque proposition montrée en vrai, et une barre de
 * réglages qui fait ce que fera un jour la surcharge du back-office (`knobs.ts`).
 */
import { computed, onBeforeUnmount, ref, watchEffect } from "vue";
import { Button, Segmented, UiRoot, Wordmark } from "../src/index.js";
import { MOTION_LEVEL_NAMES, PROPOSED, THEME_NAMES } from "../src/tokens.js";
import CipherSection from "./cipher/CipherSection.vue";
import { applyKnobs, defaultKnobs, loadKnobs, saveKnobs, type Knobs } from "./knobs.js";
import LabKnob from "./LabKnob.vue";
import LabRange from "./LabRange.vue";
import MotionSection from "./motion/MotionSection.vue";
import PaperSection from "./paper/PaperSection.vue";
import TokensSection from "./tokens/TokensSection.vue";

const knobs = ref<Knobs>(loadKnobs());

watchEffect(() => {
  applyKnobs(knobs.value);
  saveKnobs(knobs.value);
});

/** Le système demande moins de mouvement : il l'emporte sur le réglage, et le libellé le dit. */
const reducedQuery = matchMedia("(prefers-reduced-motion: reduce)");
const reduced = ref(reducedQuery.matches);
const onReducedChange = () => (reduced.value = reducedQuery.matches);
reducedQuery.addEventListener("change", onReducedChange);
onBeforeUnmount(() => reducedQuery.removeEventListener("change", onReducedChange));

const themeOptions = THEME_NAMES.map((name) => ({ value: name, label: name }));
const motionOptions = MOTION_LEVEL_NAMES.map((name) => ({ value: name, label: name }));
const resorbOptions = ["dither", "recede", "none"].map((value) => ({ value, label: value }));

const resorb = computed(() => knobs.value.overrides["--occ-paper-resorb"] ?? PROPOSED.paper.resorb);

function override(name: string, value: string) {
  knobs.value = { ...knobs.value, overrides: { ...knobs.value.overrides, [name]: value } };
}

function reset() {
  knobs.value = defaultKnobs();
}

// Changer d'intensité ou de tempo remonte les démonstrations : chacune relit les réglages à
// son départ, comme le ferait une page à son ouverture.
const revision = computed(
  () => `${knobs.value.motion}:${knobs.value.overrides["--occ-tempo"] ?? "1"}`,
);
</script>

<template>
  <UiRoot full-page>
    <div class="occ-lab-knobs">
      <Wordmark section="redesign lab" />
      <a class="occ-label" href="/admin/#/design">Design system →</a>
      <LabKnob label="Theme">
        <Segmented v-model="knobs.theme" :options="themeOptions" />
      </LabKnob>
      <LabKnob :label="reduced ? 'Motion · OS asks for reduced motion: still wins' : 'Motion'">
        <Segmented v-model="knobs.motion" :options="motionOptions" />
      </LabKnob>
      <LabRange
        label="Tempo"
        name="--occ-tempo"
        :min="0.25"
        :max="3"
        :step="0.25"
        :fallback="1"
        :overrides="knobs.overrides"
        @change="override"
      />
      <LabRange
        label="Paper speed"
        name="--occ-paper-speed"
        :min="150"
        :max="3000"
        :step="50"
        :fallback="PROPOSED.paper.speed"
        :overrides="knobs.overrides"
        @change="override"
      />
      <LabRange
        label="Paper grid"
        name="--occ-paper-grid"
        :min="4"
        :max="24"
        :step="2"
        :fallback="PROPOSED.paper.grid"
        unit="px"
        :overrides="knobs.overrides"
        @change="override"
      />
      <LabRange
        label="Paper dot"
        name="--occ-paper-dot-size"
        :min="1"
        :max="4"
        :step="1"
        :fallback="PROPOSED.paper.dot"
        unit="px"
        :overrides="knobs.overrides"
        @change="override"
      />
      <LabKnob label="Paper resorb">
        <Segmented
          :model-value="resorb"
          :options="resorbOptions"
          @update:model-value="override('--occ-paper-resorb', $event)"
        />
      </LabKnob>
      <Button size="sm" variant="ghost" @click="reset">Reset</Button>
    </div>
    <main class="occ-page occ-lab">
      <TokensSection />
      <CipherSection :key="`cipher-${revision}`" />
      <PaperSection
        :key="`paper-${revision}`"
        :resorb="resorb"
        @update:resorb="override('--occ-paper-resorb', $event)"
      />
      <MotionSection :key="`motion-${revision}`" />
    </main>
  </UiRoot>
</template>
