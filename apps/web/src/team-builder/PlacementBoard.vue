<script setup lang="ts">
/**
 * Le canevas du placement, autour du dessin impératif de `placement-canvas.ts` : monté une
 * fois par plateau et par camp, il reçoit ensuite les pièces à chaque changement.
 */
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from "vue";
import type { Board, Coord, PlayerId } from "@occulis/core";
import { IconButton, QuickBar, Toolbar, useMessages } from "@occulis/ui";
import type { TeamDraft } from "./model.js";
import { mountPlacement, type PlacementCanvas } from "./placement-canvas.js";

const props = defineProps<{
  board: Board;
  side: PlayerId;
  zone: readonly Coord[];
  opponentZone: readonly Coord[];
  draft: TeamDraft;
  /** L'initiale dessinée sur une pièce. */
  initialOf: (kind: string) => string;
}>();

const emit = defineEmits<{ pick: [coord: Coord] }>();

const messages = useMessages();
const text = computed(() => messages.value.team.board);
const canvas = useTemplateRef<HTMLCanvasElement>("canvas");
const placement = shallowRef<PlacementCanvas | null>(null);

function mount() {
  placement.value?.destroy();
  placement.value =
    canvas.value === null
      ? null
      : mountPlacement(canvas.value, props.board, props.side, (coord) => emit("pick", coord));
  draw();
}

function draw() {
  placement.value?.update({
    side: props.side,
    zone: props.zone,
    opponentZone: props.opponentZone,
    initialOf: props.initialOf,
    pieces: props.draft.slots.flatMap((slot, index) =>
      slot.coord === undefined
        ? []
        : [{ coord: slot.coord, kind: slot.kind, selected: props.draft.selected === index }],
    ),
  });
}

onMounted(mount);
watch(() => [props.board, props.side], mount);
watch(() => [props.draft, props.zone, props.opponentZone, props.initialOf], draw);
onBeforeUnmount(() => placement.value?.destroy());
</script>

<template>
  <canvas
    ref="canvas"
    :aria-label="text.label"
    style="display: block; width: 100%; height: clamp(300px, 52vh, 520px)"
  />
  <Toolbar>
    <QuickBar>
      <IconButton icon="rotateLeft" :label="text.rotate" @click="placement?.rotate(-1)" />
      <IconButton icon="rotateRight" :label="text.rotate" @click="placement?.rotate(1)" />
    </QuickBar>
  </Toolbar>
</template>
