<script setup lang="ts">
/** Les retouches : le thème montré, la vitesse des animations, et la palette à copier. */
import { computed } from "vue";
import { Button, Card, Note, Segmented, useMessages, useToast } from "@occulis/ui";
import { THEME_NAMES, THEMES, type ThemeName } from "@occulis/ui/tokens";
import { useTweaks } from "./tweaks-context.js";
import { editedCount, paletteSource } from "./tweaks.js";

/** Les vitesses proposées : temps réel, puis de plus en plus lent. */
const SPEEDS = [1, 0.5, 0.25, 0.1] as const;

const messages = useMessages();
const text = computed(() => messages.value.admin.design.tweaks);
const notify = useToast();
const tweaks = useTweaks();

const edited = computed(() => editedCount(tweaks.palette, THEMES[tweaks.theme]));
const themeOptions = computed(() =>
  THEME_NAMES.map((name) => ({ value: name, label: text.value.themes[name] })),
);
const speedOptions = computed(() =>
  SPEEDS.map((factor) => ({ value: String(factor), label: text.value.speedOption(factor) })),
);

async function copy() {
  try {
    if (navigator.clipboard === undefined) throw new Error("clipboard");
    await navigator.clipboard.writeText(paletteSource(tweaks.theme, tweaks.palette));
    notify(text.value.copied);
  } catch {
    notify(text.value.copyFailed, false);
  }
}
</script>

<template>
  <Card :title="text.title">
    <template #action>
      <Button size="sm" icon="copy" @click="copy">{{ text.copy }}</Button>
      <Button size="sm" variant="ghost" :disabled="edited === 0" @click="tweaks.reset">
        {{ text.reset }}
      </Button>
    </template>
    <Segmented
      :label="text.theme"
      :model-value="tweaks.theme"
      :options="themeOptions"
      @update:model-value="(theme: ThemeName) => tweaks.setTheme(theme)"
    />
    <Segmented
      :label="text.speed"
      :model-value="String(tweaks.speed)"
      :options="speedOptions"
      @update:model-value="(value: string) => tweaks.setSpeed(Number(value))"
    />
    <Note>{{ text.edited(edited) }} · {{ text.hint }}</Note>
  </Card>
</template>
