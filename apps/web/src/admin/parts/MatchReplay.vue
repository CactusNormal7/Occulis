<script setup lang="ts">
/**
 * La liste des coups, et sous elle le plateau à l'image choisie. Survoler un coup le
 * montre ; cliquer l'épingle, et le plateau y revient quand la souris quitte la liste.
 * Les flèches du clavier parcourent la partie, la lecture la déroule.
 */
import { computed, onBeforeUnmount, onMounted, ref, watchEffect } from "vue";
import { Board } from "@occulis/core";
import type { AdminMatchDetail } from "@occulis/protocol";
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
} from "@occulis/ui";
import ReplayBoard from "../../replay/ReplayBoard.vue";
import { clampFrame, describeEntry, frameLabel, type Perspective } from "../../replay/replay.js";

const props = defineProps<{ match: AdminMatchDetail }>();

/** Le temps passé sur chaque image pendant la lecture. */
const PLAY_STEP_MS = 900;

const messages = useMessages();
const text = computed(() => messages.value.admin.match);

const count = computed(() => props.match.frames.length);
const lastFrame = computed(() => count.value - 1);
/** L'image épinglée par un clic, à laquelle le plateau revient. */
const pinned = ref(lastFrame.value);
/** L'image montrée : l'épinglée, ou celle que survole la souris. */
const shown = ref(lastFrame.value);
const playing = ref(false);
const perspective = ref<Perspective>("all");
const turns = ref(0);

// La carte que la partie a figée ; absente quand le serveur n'a pas su la relire.
const board = computed(() =>
  props.match.board === null ? undefined : new Board(props.match.board),
);

const entries = computed<MoveEntry[]>(() => [
  { number: "—", text: text.value.start },
  ...props.match.log.map((logged) => ({
    number: String(logged.seq + 1),
    ...(logged.player !== null ? { seat: logged.player } : {}),
    text: describeEntry(props.match, logged.seq),
    disabled: logged.seq + 1 >= count.value,
  })),
]);

const perspectives = computed(() => [
  { value: "all" as const, label: text.value.everything },
  { value: "A" as const, label: text.value.viewOf(props.match.playerA.handle), camp: "A" as const },
  { value: "B" as const, label: text.value.viewOf(props.match.playerB.handle), camp: "B" as const },
]);

function pin(index: number) {
  const frame = clampFrame(index, count.value);
  pinned.value = frame;
  shown.value = frame;
}

/** Un saut demandé à la main : il arrête la lecture. */
function go(index: number) {
  playing.value = false;
  pin(index);
}

function togglePlay() {
  // Lancée depuis la dernière image, la lecture repart du début.
  if (!playing.value && pinned.value >= lastFrame.value) pin(0);
  playing.value = !playing.value;
}

// La lecture avance d'une image, puis se réarme : elle repart de zéro dès que l'image
// épinglée change, quelle qu'en soit la cause.
watchEffect((onCleanup) => {
  if (!playing.value) return;
  if (pinned.value >= lastFrame.value) {
    playing.value = false;
    return;
  }
  const next = pinned.value + 1;
  const timer = setTimeout(() => pin(next), PLAY_STEP_MS);
  onCleanup(() => clearTimeout(timer));
});

function onKey(event: KeyboardEvent) {
  if (event.target instanceof HTMLInputElement) return;
  if (event.key === "ArrowLeft") go(pinned.value - 1);
  else if (event.key === "ArrowRight") go(pinned.value + 1);
  else return;
  event.preventDefault();
}

onMounted(() => document.addEventListener("keydown", onKey));
onBeforeUnmount(() => document.removeEventListener("keydown", onKey));
</script>

<template>
  <Card :title="text.moves(match.log.length)" flush>
    <template #action>
      <span class="occ-muted">{{ text.hint }}</span>
    </template>

    <MoveList
      :entries="entries"
      :shown="shown"
      :pinned="pinned"
      @preview="shown = $event"
      @pick="go"
      @leave="shown = pinned"
    />

    <EmptyState v-if="board === undefined">{{ text.unknownMap(match.scenario) }}</EmptyState>
    <div v-else>
      <Toolbar>
        <QuickBar>
          <IconButton icon="first" :label="text.first" @click="go(0)" />
          <IconButton icon="previous" :label="text.previous" @click="go(pinned - 1)" />
          <IconButton
            :icon="playing ? 'pause' : 'play'"
            :label="playing ? text.pause : text.play"
            @click="togglePlay"
          />
          <IconButton icon="next" :label="text.next" @click="go(pinned + 1)" />
          <IconButton icon="last" :label="text.last" @click="go(lastFrame)" />
        </QuickBar>
        <ToolbarText>{{ frameLabel(match, shown) }}</ToolbarText>
        <Segmented v-model="perspective" :label="text.perspective" :options="perspectives" />
        <QuickBar>
          <IconButton icon="rotateLeft" :label="text.rotate" @click="turns -= 1" />
          <IconButton icon="rotateRight" :label="text.rotate" @click="turns += 1" />
        </QuickBar>
      </Toolbar>
      <ReplayBoard
        :board="board"
        :frames="match.frames"
        :index="shown"
        :perspective="perspective"
        :turns="turns"
      />
    </div>
  </Card>
</template>
