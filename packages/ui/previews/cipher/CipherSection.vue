<script setup lang="ts">
/** Chantier 2 : l'alphabet cryptique. */
import { computed, ref } from "vue";
import { Badge, Button, Card, Segmented, Stage } from "../../src/index.js";
import {
  CIPHER_ALPHABETS,
  CipherFrieze,
  CipherText,
  alphabet,
  type CipherAlphabet,
  type CipherMode,
} from "../../src/lab/index.js";
import AlphabetTable from "./AlphabetTable.vue";
import HoverLink from "./HoverLink.vue";

const DIRECTIONS: Record<CipherAlphabet, { title: string; text: string }> = {
  lattice: {
    title: "A · Lattice",
    text: "Each glyph is a fragment of the isometric cube of a board tile: top, bottom and vertical edges, 2:1 slopes like the board's. The most coherent with the board; reads as architecture.",
  },
  stele: {
    title: "B · Steles",
    text: "A vertical stem and notches at three heights, flat or on the iso slope. Height as writing; close to ogham or runes, the easiest to scan in a line.",
  },
  orbit: {
    title: "C · Orbits",
    text: "Stars linked on a 3 × 3 grid, sometimes a notched eye at the centre. Echoes the star vault and the name; the airiest, the least legible at small sizes.",
  },
};

const alphabetOptions = CIPHER_ALPHABETS.map((value) => ({
  value,
  label: DIRECTIONS[value].title,
}));
const decodabilityOptions = [
  { value: "yes", label: "Decodable" },
  { value: "no", label: "Ornament" },
];

const name = ref<CipherAlphabet>("lattice");
const decodability = ref<"yes" | "no">("yes");
const decodable = computed(() => decodability.value === "yes");
const play = ref(0);
const mode = ref<CipherMode>("cipher");

const tableTitle = computed(() => {
  const keying = decodable.value
    ? "fixed key, one glyph per letter"
    : "random glyph per position, nothing to decode";
  return `${DIRECTIONS[name.value].title} · ${alphabet(name.value).pool.length} glyphs in the family · ${keying}`;
});

function animate(next: CipherMode) {
  mode.value = next;
  play.value += 1;
}
</script>

<template>
  <section id="cipher" class="occ-lab-section">
    <header>
      <h2 class="occ-label">2 · Cryptic glyphs</h2>
      <p>
        Three directions, drawn in the same 9 × 11 cell with a one-pixel stroke. The text always
        exists for a screen reader: glyphs are only clothing, never the sole carrier of information.
      </p>
    </header>
    <div class="occ-lab-row">
      <Segmented v-model="name" label="Alphabet" :options="alphabetOptions" />
      <Segmented v-model="decodability" label="Decodability" :options="decodabilityOptions" />
    </div>
    <p class="occ-lab-note">{{ DIRECTIONS[name].text }}</p>
    <Stage :title="tableTitle">
      <AlphabetTable :name="name" :decodable="decodable" />
    </Stage>
    <Stage title="Decode · encode">
      <template #actions>
        <Button size="sm" icon="play" @click="animate('decode')">Decode</Button>
        <Button size="sm" @click="animate('encode')">Encode</Button>
      </template>
      <div class="occ-lab-display">
        <CipherText
          text="Occulis"
          :alphabet="name"
          :decodable="decodable"
          :mode="mode"
          :play-key="play"
        />
      </div>
      <p class="occ-lab-note">
        <CipherText
          text="Vision is the only weapon"
          :alphabet="name"
          :decodable="decodable"
          :mode="mode"
          :play-key="play"
          :seed="3"
        />
      </p>
      <p class="occ-lab-note">
        Just before a glyph yields its letter, it shows its true glyph for one tick: with a
        decodable alphabet, that is how a patient player learns the key.
      </p>
    </Stage>
    <div class="occ-lab-grid">
      <Card title="Border">
        <CipherFrieze :count="18" :alphabet="name" live :seed="11" />
        <p class="occ-lab-note">
          A faint frieze along a frame, one glyph shifting every ~1.4 s. Off in calm and still.
        </p>
      </Card>
      <Card title="Loading">
        <p class="occ-lab-note">
          <CipherText
            text="Searching an opponent"
            :alphabet="name"
            :decodable="false"
            mode="decode"
            pace="slow"
            :play-key="play"
            :seed="5"
          />
        </p>
        <CipherFrieze :count="8" :alphabet="name" live :seed="4" />
      </Card>
      <Card title="Hover">
        <div class="occ-lab-row">
          <HoverLink label="Profile" :name="name" />
          <HoverLink label="Friends" :name="name" />
          <HoverLink label="Settings" :name="name" />
        </div>
        <p class="occ-lab-note">
          Label scrambles for 250 ms on hover or focus. The cheapest use; also the most likely to
          tire.
        </p>
      </Card>
      <Card title="Rarity">
        <Badge tone="dim">≤ 1 cipher event on screen</Badge>
        <p class="occ-lab-note">
          Titles decode once per session; ornaments never compete with a timer or a game state.
        </p>
      </Card>
    </div>
  </section>
</template>
