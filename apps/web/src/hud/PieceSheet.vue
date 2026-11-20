<script setup lang="ts">
/**
 * La fiche de la pièce choisie, en tête de la colonne de droite : celle d'un clic droit, ou
 * la pièce sélectionnée avec ce qu'elle peut faire ce tour-ci. Sans pièce, ce qui se fait
 * à la souris.
 */
import { computed } from "vue";
import { useMessages } from "@occulis/ui";
import type { SheetCard } from "./model.js";
import PieceGlyph from "./PieceGlyph.vue";

defineProps<{ sheet: SheetCard | undefined }>();

const messages = useMessages();
const t = computed(() => messages.value.game.hud);
</script>

<template>
  <section
    class="hud-sheet hud-panel"
    :class="{ 'hud-panel--threat': sheet?.alert !== undefined }"
    :aria-label="t.sheet"
  >
    <template v-if="sheet !== undefined">
      <div class="hud-sheet__head">
        <PieceGlyph :kind="sheet.kind" :camp="sheet.camp" :ghost="sheet.ghost" large />
        <div>
          <h2 class="hud-sheet__title hud-caps">{{ sheet.title }}</h2>
          <p class="hud-dim">{{ sheet.place }}</p>
          <p v-if="sheet.alert !== undefined" class="hud-caps hud-threat">{{ sheet.alert }}</p>
        </div>
      </div>
      <p v-if="sheet.description !== undefined" class="hud-soft">{{ sheet.description }}</p>
      <dl class="hud-facts">
        <template v-for="fact in sheet.facts" :key="fact.label">
          <dt>{{ fact.label }}</dt>
          <dd>{{ fact.value }}</dd>
        </template>
      </dl>
      <p v-if="sheet.reach !== undefined" class="hud-soft">
        <span class="hud-legal">{{ sheet.reach.moves }}</span>
        <template v-if="sheet.reach.captures !== undefined">
          · <span class="hud-threat">{{ sheet.reach.captures }}</span>
        </template>
      </p>
      <p v-for="note in sheet.notes" :key="note" class="hud-faint">{{ note }}</p>
    </template>
    <template v-else>
      <p class="hud-caps hud-dim">{{ t.noSelection }}</p>
      <p class="hud-faint">{{ t.hint }}</p>
    </template>
  </section>
</template>
