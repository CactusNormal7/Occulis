<script setup lang="ts">
/**
 * Le plateau rejoué d'une partie **finie**, donc révélée en entier : le point de vue d'un
 * camp, de l'autre, ou les deux ensemble, au départ celui qu'on tenait. Survoler un coup
 * de la liste le montre, cliquer l'épingle.
 */
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { Board, type PlayerId } from "@occulis/core";
import type { MeMatchDetail } from "@occulis/protocol";
import {
  Card,
  EmptyState,
  IconButton,
  MoveList,
  QuickBar,
  Segmented,
  Toolbar,
  ToolbarText,
  useMessages,
  type MoveEntry,
  type SegmentedOption,
} from "@occulis/ui";
import ReplayBoard from "../../replay/ReplayBoard.vue";
import { clampFrame, describeEntry, type Perspective } from "../../replay/replay.js";

const props = defineProps<{
  match: MeMatchDetail;
  /** Le pseudo de l'ami dont c'est le camp ; absent, c'est le sien. */
  friend?: string | undefined;
}>();

const messages = useMessages();
const text = computed(() => messages.value.profile);
const controls = computed(() => text.value.replayControls);

const count = computed(() => props.match.frames.length);
const lastFrame = computed(() => count.value - 1);
/** L'image épinglée par un clic, à laquelle le plateau revient. */
const pinned = ref(lastFrame.value);
/** L'image montrée : l'épinglée, ou celle que survole la souris. */
const shown = ref(lastFrame.value);
const turns = ref(0);
const perspective = ref<Perspective>(props.match.seat);

// La carte que la partie a figée ; absente quand le serveur n'a pas su la relire.
const board = computed(() =>
  props.match.board === null ? undefined : new Board(props.match.board),
);

/** Le nom de qui tient un camp : soi (ou l'ami), ou l'adversaire. */
const selfName = computed(() => props.friend ?? text.value.replay.you);
function nameOf(seat: "A" | "B" | null): string {
  return seat === props.match.seat ? selfName.value : props.match.opponent;
}

const frameLabel = computed(() => {
  if (shown.value === 0) return text.value.replay.start;
  const logged = props.match.log[shown.value - 1];
  return text.value.replay.move(
    shown.value,
    props.match.log.length,
    nameOf(logged?.player ?? null),
    logged?.action.kind === "resign",
  );
});

const entries = computed<MoveEntry[]>(() => [
  { number: "—", text: text.value.replay.start },
  ...props.match.log.map((logged) => {
    const notation = describeEntry(props.match, logged.seq);
    return {
      number: String(logged.seq + 1),
      ...(logged.player !== null ? { seat: logged.player } : {}),
      text: notation.short,
      detail: notation.detail,
      disabled: logged.seq + 1 >= count.value,
    };
  }),
]);

const perspectives = computed<SegmentedOption<Perspective>[]>(() => {
  const own: PlayerId = props.match.seat;
  const other: PlayerId = own === "A" ? "B" : "A";
  return [
    { value: own, label: text.value.replay.viewOf(selfName.value), camp: own },
    { value: other, label: text.value.replay.viewOf(props.match.opponent), camp: other },
    { value: "all", label: text.value.replay.everything },
  ];
});

const title = computed(() =>
  props.friend === undefined
    ? text.value.replay.title
    : messages.value.social.friend.replayTitle(props.friend),
);

function go(index: number) {
  const frame = clampFrame(index, count.value);
  pinned.value = frame;
  shown.value = frame;
}

/** Les flèches parcourent la partie, comme les boutons ; sauf dans un champ de saisie. */
function onKey(event: KeyboardEvent) {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const target = event.target;
  if (target instanceof HTMLElement && target.closest("input, textarea, select, [contenteditable]"))
    return;
  if (event.key === "ArrowLeft") go(pinned.value - 1);
  else if (event.key === "ArrowRight") go(pinned.value + 1);
  else if (event.key === "Home") go(0);
  else if (event.key === "End") go(lastFrame.value);
  else return;
  event.preventDefault();
}

onMounted(() => document.addEventListener("keydown", onKey));
onBeforeUnmount(() => document.removeEventListener("keydown", onKey));
</script>

<template>
  <EmptyState v-if="board === undefined">{{ text.replay.unknownMap(match.scenario) }}</EmptyState>
  <Card v-else :title="title" flush>
    <template #action>
      <span class="occ-muted">{{ text.replay.hint }}</span>
    </template>
    <MoveList
      :entries="entries"
      :shown="shown"
      :pinned="pinned"
      @preview="shown = $event"
      @pick="go"
      @leave="shown = pinned"
    />
    <Toolbar>
      <QuickBar>
        <IconButton icon="first" :label="controls.first" @click="go(0)" />
        <IconButton icon="previous" :label="controls.previous" @click="go(pinned - 1)" />
        <IconButton icon="next" :label="controls.next" @click="go(pinned + 1)" />
        <IconButton icon="last" :label="controls.last" @click="go(lastFrame)" />
      </QuickBar>
      <ToolbarText>{{ frameLabel }}</ToolbarText>
      <Segmented v-model="perspective" :label="text.replay.perspective" :options="perspectives" />
      <QuickBar>
        <IconButton icon="rotateLeft" :label="controls.rotate" @click="turns -= 1" />
        <IconButton icon="rotateRight" :label="controls.rotate" @click="turns += 1" />
      </QuickBar>
    </Toolbar>
    <ReplayBoard
      :board="board"
      :frames="match.frames"
      :log="match.log"
      :index="shown"
      :perspective="perspective"
      :turns="turns"
    />
  </Card>
</template>
