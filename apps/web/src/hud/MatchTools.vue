<script setup lang="ts">
/**
 * Les outils de partie, sous la plaque adverse : les amis qui regardent, le repli de la
 * colonne de droite (pour voir le plateau en grand), et le départ — abandonner pour un
 * joueur, quitter pour un spectateur. L'engrenage des réglages est
 * celui de la page (`#settings-toggle`), posé à côté par `hud.css`.
 */
import { computed } from "vue";
import { useMessages } from "@occulis/ui";
import HudIcon from "./HudIcon.vue";

defineProps<{
  spectating: boolean;
  /** La colonne de droite (fiche et journal) est dépliée. */
  columnOpen: boolean;
  /** Combien d'amis regardent le joueur ; sans objet pour un spectateur. */
  spectators: number;
  /** L'ami regardé, pour un spectateur. */
  watchedName: string;
}>();
const emit = defineEmits<{ leave: []; toggleColumn: [] }>();

const messages = useMessages();
const t = computed(() => messages.value.game.hud);
</script>

<template>
  <div class="hud-tools">
    <span v-if="spectating" class="hud-tools__watch hud-panel hud-caps hud-soft">
      {{ t.watching(watchedName) }}
    </span>
    <span
      v-else-if="spectators > 0"
      class="hud-tools__watch hud-panel hud-soft"
      :title="t.watchers(spectators)"
    >
      <HudIcon name="eye" />{{ spectators }}
      <span class="hud-visually-hidden">{{ t.watchers(spectators) }}</span>
    </span>
    <button
      class="hud-button hud-button--quiet hud-button--icon"
      type="button"
      aria-controls="hud-column"
      :aria-expanded="columnOpen"
      :aria-label="columnOpen ? t.column.hide : t.column.show"
      :title="columnOpen ? t.column.hide : t.column.show"
      @click="emit('toggleColumn')"
    >
      <HudIcon :name="columnOpen ? 'columnOpen' : 'columnClosed'" />
    </button>
    <button class="hud-button hud-button--quiet" type="button" @click="emit('leave')">
      {{ spectating ? t.leave : t.resign }}
    </button>
  </div>
</template>
