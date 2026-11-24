<script setup lang="ts">
/** Les tokens : la palette (retouchable), l'os par alpha, la typographie, les écarts, le mouvement. */
import { computed } from "vue";
import { Card, CardGrid, Specimen, Swatch, SwatchGrid, Table, useMessages } from "@occulis/ui";
import { FONT, SPACE, THEMES, cssColor, paletteVariables } from "@occulis/ui/tokens";
import { useTweaks } from "../tweaks-context.js";
import { fromHex, paletteEntries, toHex } from "../tweaks.js";
import MotionTokens from "./MotionTokens.vue";

/** Les encres : l'os du thème à chaque alpha que la charte emploie. */
const INKS = [
  "--occ-ink",
  "--occ-ink-soft",
  "--occ-ink-dim",
  "--occ-ink-faint",
  "--occ-ink-line",
  "--occ-ink-ghost",
] as const;

const messages = useMessages();
const text = computed(() => messages.value.admin.design);
const tweaks = useTweaks();

/** La valeur d'origine de chaque entrée du thème : une entrée qui en diffère est retouchée. */
const reference = computed(
  () => new Map(paletteEntries(THEMES[tweaks.theme]).map((entry) => [entry.path, entry.value])),
);
const entries = computed(() => paletteEntries(tweaks.palette));
const variables = computed(() => paletteVariables(tweaks.palette));
const variableCount = computed(() => Object.keys(variables.value).length);

function retouch(path: string, hex: string) {
  const value = fromHex(hex);
  if (value !== undefined) tweaks.setColor(path, value);
}
</script>

<template>
  <Card :title="text.foundations.palette(text.tweaks.themes[tweaks.theme])">
    <SwatchGrid>
      <Swatch
        v-for="entry in entries"
        :key="entry.path"
        :name="entry.path"
        :color="cssColor(entry.value)"
        :value="toHex(entry.value)"
        :edited="reference.get(entry.path) !== entry.value"
        @change="(hex: string) => retouch(entry.path, hex)"
      />
    </SwatchGrid>
  </Card>

  <CardGrid>
    <Card :title="text.foundations.ink">
      <SwatchGrid>
        <Swatch
          v-for="name in INKS"
          :key="name"
          :name="name"
          :color="`var(${name})`"
          :value="variables[name] ?? ''"
        />
      </SwatchGrid>
    </Card>
    <Card :title="text.foundations.space">
      <Specimen
        v-for="(px, step) in SPACE"
        :key="step"
        :name="`--occ-space-${step}`"
        :value="`${px}px`"
      >
        <span
          :style="{
            display: 'block',
            width: `var(--occ-space-${step})`,
            height: '8px',
            background: 'var(--occ-ink-dim)',
          }"
        />
      </Specimen>
    </Card>
  </CardGrid>

  <Card :title="text.foundations.type">
    <Specimen
      v-for="(px, step) in FONT.size"
      :key="step"
      :name="`--occ-text-${step}`"
      :value="`${px}px`"
    >
      <span :style="{ fontSize: `var(--occ-text-${step})`, lineHeight: 1.2, whiteSpace: 'nowrap' }">
        {{ text.foundations.sample }}
      </span>
    </Specimen>
    <Specimen name="--occ-font-pixel" value="Tiny5">
      <span style="font-family: var(--occ-font-pixel)">{{ text.foundations.sample }}</span>
    </Specimen>
    <Specimen name="--occ-font-mono" value="ui-monospace">
      <span style="font-family: var(--occ-font-mono)">{{ text.foundations.sample }}</span>
    </Specimen>
  </Card>

  <MotionTokens />

  <Card :title="text.foundations.variables(variableCount)">
    <Table :columns="[text.foundations.name, text.foundations.value]" :row-count="variableCount">
      <tr v-for="(value, name) in variables" :key="name">
        <td>
          <code>{{ name }}</code>
        </td>
        <td>
          <code>{{ value }}</code>
        </td>
      </tr>
    </Table>
  </Card>
</template>
