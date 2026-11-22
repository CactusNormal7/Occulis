<script setup lang="ts">
/**
 * L'historique d'une partie, en colonnes : numéro, camp, coup, chaque ligne dans la
 * couleur du camp qui l'a joué. Survoler montre (`preview`), cliquer épingle (`pick`) ;
 * `leave` part quand la souris quitte la liste.
 *
 * Un coup trop long pour sa colonne est coupé par « … ». Au survol ou au focus, une
 * infobulle dit ce que le coup veut dire (`detail`), ou à défaut son texte entier s'il a
 * été coupé. Elle est rendue dans `body` : la liste défile, elle la couperait sinon.
 */
import { ref, useId } from "vue";
import type { MoveEntry } from "../types.js";

const props = defineProps<{
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

/** L'écart entre la ligne et son infobulle, et la place gardée au bord de l'écran. */
const TIP_GAP = 4;
const TIP_MARGIN = 16;
const TIP_MAX_WIDTH = 320;

interface Tip {
  readonly index: number;
  readonly text: string;
  readonly left: number;
  readonly top: number;
}

const tip = ref<Tip | undefined>(undefined);
const tipId = useId();

function show(index: number, event: Event) {
  emit("preview", index);
  const entry = props.entries[index];
  const row = event.currentTarget;
  if (entry === undefined || !(row instanceof HTMLElement)) return;
  const label = row.querySelector(".occ-move__text");
  const cut = label instanceof HTMLElement && label.scrollWidth > label.clientWidth;
  const text = entry.detail ?? (cut ? entry.text : undefined);
  if (text === undefined || text === "") {
    tip.value = undefined;
    return;
  }
  const box = row.getBoundingClientRect();
  const widest = Math.min(TIP_MAX_WIDTH, window.innerWidth - TIP_MARGIN * 2);
  tip.value = {
    index,
    text,
    left: Math.max(TIP_MARGIN, Math.min(box.left, window.innerWidth - TIP_MARGIN - widest)),
    top: box.bottom + TIP_GAP,
  };
}

function hide() {
  tip.value = undefined;
}

function leaveList() {
  hide();
  emit("leave");
}
</script>

<template>
  <div class="occ-move-list" @mouseleave="leaveList" @scroll.passive="hide">
    <button
      v-for="(entry, index) in entries"
      :key="index"
      type="button"
      :disabled="entry.disabled"
      :aria-describedby="tip?.index === index ? tipId : undefined"
      :class="[
        'occ-move',
        entry.seat !== undefined && `occ-move--${entry.seat}`,
        { 'occ-move--shown': index === shown, 'occ-move--pinned': index === pinned },
      ]"
      @mouseenter="show(index, $event)"
      @focus="show(index, $event)"
      @blur="hide"
      @click="emit('pick', index)"
    >
      <span class="occ-move__number">{{ entry.number }}</span>
      <span class="occ-move__seat">{{ entry.seat ?? "" }}</span>
      <span class="occ-move__text">{{ entry.text }}</span>
    </button>
  </div>
  <Teleport v-if="tip !== undefined" to="body">
    <div
      :id="tipId"
      class="occ-move-tip"
      role="tooltip"
      :style="{ left: `${tip.left}px`, top: `${tip.top}px` }"
    >
      {{ tip.text }}
    </div>
  </Teleport>
</template>
