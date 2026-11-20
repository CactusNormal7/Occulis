<script setup lang="ts">
/**
 * L'historique d'une partie, en colonnes : numéro, camp, coup, chaque ligne dans la
 * couleur du camp qui l'a joué. Survoler montre (`preview`), cliquer épingle (`pick`) ;
 * `leave` part quand la souris quitte la liste.
 */
import type { MoveEntry } from "../types.js";

defineProps<{
  entries: readonly MoveEntry[];
  /** L'entrée montrée en ce moment (survol). */
  shown?: number | undefined;
  /** L'entrée épinglée, à laquelle la vue revient. Marquée dans la teinte de la sélection. */
  pinned?: number | undefined;
}>();

const emit = defineEmits<{
  preview: [index: number];
  pick: [index: number];
  leave: [];
}>();
</script>

<template>
  <div class="occ-move-list" @mouseleave="emit('leave')">
    <button
      v-for="(entry, index) in entries"
      :key="index"
      type="button"
      :disabled="entry.disabled"
      :class="[
        'occ-move',
        entry.seat !== undefined && `occ-move--${entry.seat}`,
        { 'occ-move--shown': index === shown, 'occ-move--pinned': index === pinned },
      ]"
      @mouseenter="emit('preview', index)"
      @focus="emit('preview', index)"
      @click="emit('pick', index)"
    >
      <span class="occ-move__number">{{ entry.number }}</span>
      <span class="occ-move__seat">{{ entry.seat ?? "" }}</span>
      <span class="occ-move__text">{{ entry.text }}</span>
    </button>
  </div>
</template>
