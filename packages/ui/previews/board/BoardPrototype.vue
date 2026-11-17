<script setup lang="ts">
/**
 * Prototype « un coup sur le plateau » : sélectionner une pièce (elle s'élève, ses
 * destinations s'ouvrent en cascade), la déplacer (un saut en arc, des images rémanentes, une
 * onde à la retombée), puis la ligne de vue se redéploie en vague depuis la case d'arrivée ;
 * un adversaire qui entre dans la vue se matérialise, un adversaire qui en sort laisse son
 * fantôme. Le plateau réel est en PixiJS : ceci n'en est que la mise en scène.
 */
import { computed, onBeforeUnmount, ref, shallowRef, useTemplateRef } from "vue";
import { hopAt, trailAt, waveDelayMs } from "../../src/lab/choreography.js";
import { diamond, durationMs, project, readMotion, type Tile } from "../../src/lab/index.js";
import { PROPOSED } from "../../src/tokens.js";
import {
  START,
  allTiles,
  chebyshev,
  destinations,
  isWall,
  key,
  visibleTo,
  type MockPiece,
} from "../board-mock.js";
import BoardWall from "./BoardWall.vue";
import { ISO, VIEW, WALL_HEIGHT, placeAt, top } from "./iso.js";
import PieceShape from "./PieceShape.vue";

defineProps<{
  /** Le libellé accessible du plateau. */
  label: string;
}>();

interface Move {
  readonly id: string;
  readonly from: Tile;
  readonly to: Tile;
}

/** Les cases du fond vers l'avant : l'ordre où elles se recouvrent. */
const tiles = allTiles().sort((a, b) => a.x + a.y - (b.x + b.y));
const walls = tiles.filter(isWall);
// Lu une fois : un changement d'intensité ou de tempo remonte le plateau (`LabPage`).
const motion = readMotion();
const trailIndexes = Array.from({ length: PROPOSED.trail.count }, (_, index) => index);

const pieces = shallowRef<readonly MockPiece[]>(START);
const selected = ref<string | null>(null);
const moving = shallowRef<Move | null>(null);
const wave = shallowRef<{ origin: Tile; key: number } | null>(null);
const ghosts = shallowRef<ReadonlyMap<string, MockPiece>>(new Map());
const revealed = shallowRef<ReadonlySet<string>>(new Set());

const hop = useTemplateRef<SVGGElement>("hop");
/** Les images rémanentes du saut, tracées hors de Vue comme le saut lui-même. */
const trails: (SVGGElement | null)[] = [];
let frame = 0;
// Le saut en cours s'arrête avec le plateau : remis à zéro ou remonté par un réglage, il ne
// doit plus écrire sur des nœuds détachés ni poser une pièce sur un plateau disparu.
onBeforeUnmount(() => cancelAnimationFrame(frame));

const seen = computed(() => visibleTo("A", pieces.value));
const selectedPiece = computed(() => pieces.value.find((piece) => piece.id === selected.value));
const targets = computed(() =>
  selectedPiece.value === undefined || moving.value !== null
    ? new Map<string, number>()
    : destinations(selectedPiece.value, pieces.value),
);
const destinationTiles = computed(() =>
  [...targets.value].map(([tileKey, distance]) => {
    const [x, y] = tileKey.split(",").map(Number) as [number, number];
    return { tileKey, tile: { x, y }, distance };
  }),
);
const visiblePieces = computed(() =>
  pieces.value
    .filter(
      (piece) =>
        piece.id !== moving.value?.id && (piece.camp === "A" || seen.value.has(key(piece.at))),
    )
    .sort((a, b) => a.at.x + a.at.y - (b.at.x + b.at.y)),
);
const movingPiece = computed(() =>
  moving.value === null ? undefined : pieces.value.find((piece) => piece.id === moving.value?.id),
);

function waveDelay(tile: Tile): string {
  const current = wave.value;
  return current === null
    ? "0ms"
    : `${waveDelayMs(chebyshev(current.origin, tile), "wave", motion)}ms`;
}

function pieceKey(piece: MockPiece): string {
  return `${piece.id}-${revealed.value.has(piece.id) ? (wave.value?.key ?? 0) : 0}`;
}

function land(move: Move) {
  const after = pieces.value.map((piece) =>
    piece.id === move.id ? { ...piece, at: move.to } : piece,
  );
  const before = visibleTo("A", pieces.value);
  const now = visibleTo("A", after);
  // Un adversaire qui sort de la vue laisse son fantôme ; qui y entre, se matérialise.
  const nextGhosts = new Map(ghosts.value);
  const entering = new Set<string>();
  for (const enemy of after.filter((piece) => piece.camp === "B")) {
    const was = before.has(key(enemy.at));
    const is = now.has(key(enemy.at));
    if (was && !is) nextGhosts.set(enemy.id, enemy);
    if (is) nextGhosts.delete(enemy.id);
    if (!was && is) entering.add(enemy.id);
  }
  ghosts.value = nextGhosts;
  revealed.value = entering;
  pieces.value = after;
  moving.value = null;
  wave.value = { origin: move.to, key: Date.now() };
}

/** Trace une image du saut, directement sur les nœuds : une image par trame ne repasse pas par Vue. */
function drawHop(t: number, move: Move) {
  const from = project(move.from, ISO);
  const target = project(move.to, ISO);
  const point = hopAt(t, from, target, motion);
  hop.value?.setAttribute("transform", `translate(${point.x} ${point.y})`);
  const behind = trailAt(t, motion);
  trails.forEach((element, index) => {
    const lag = behind[index];
    if (element === null) return;
    if (lag === undefined) {
      element.setAttribute("visibility", "hidden");
      return;
    }
    const ghost = hopAt(lag, from, target, motion);
    element.setAttribute("visibility", "visible");
    element.setAttribute("transform", `translate(${ghost.x} ${ghost.y})`);
  });
}

function play(to: Tile) {
  const piece = selectedPiece.value;
  if (piece === undefined) return;
  const move = { id: piece.id, from: piece.at, to };
  selected.value = null;
  if (motion.level === "still") {
    land(move);
    revealed.value = new Set([...revealed.value, move.id]);
    return;
  }
  moving.value = move;
  const duration = durationMs("slow", motion);
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    drawHop(t, move);
    if (t < 1) frame = requestAnimationFrame(step);
    else land(move);
  };
  frame = requestAnimationFrame(step);
}

function click(tile: Tile) {
  if (moving.value !== null) return;
  if (targets.value.has(key(tile))) {
    play(tile);
    return;
  }
  const own = pieces.value.find((piece) => piece.camp === "A" && key(piece.at) === key(tile));
  selected.value = own === undefined || own.id === selected.value ? null : own.id;
}
</script>

<template>
  <svg
    class="occ-lab-board"
    :viewBox="`0 0 ${VIEW.width} ${VIEW.height}`"
    role="img"
    :aria-label="label"
  >
    <defs>
      <pattern id="occ-lab-dither" width="2" height="2" patternUnits="userSpaceOnUse">
        <rect class="occ-lab-dither" width="1" height="1" />
        <rect class="occ-lab-dither" x="1" y="1" width="1" height="1" />
      </pattern>
    </defs>
    <polygon
      v-for="tile in tiles"
      :key="key(tile)"
      class="occ-lab-tile"
      :points="diamond(tile, ISO)"
    />
    <BoardWall v-for="tile in walls" :key="key(tile)" :tile="tile" />
    <polygon
      v-for="tile in tiles"
      :key="`fog-${key(tile)}`"
      class="occ-lab-fog"
      :data-seen="seen.has(key(tile))"
      :points="top(tile, isWall(tile) ? WALL_HEIGHT : 0)"
      fill="url(#occ-lab-dither)"
      :style="{ '--delay': waveDelay(tile) }"
    />
    <polygon
      v-if="selectedPiece !== undefined"
      class="occ-lab-selected"
      :points="diamond(selectedPiece.at, ISO)"
    />
    <polygon
      v-for="target in destinationTiles"
      :key="`dest-${target.tileKey}`"
      class="occ-lab-dest"
      :points="diamond(target.tile, ISO)"
      :style="{ '--delay': `${waveDelayMs(target.distance, 'cascade', motion)}ms` }"
    />
    <polygon
      v-if="wave !== null && motion.level !== 'still'"
      :key="`ripple-${wave.key}`"
      class="occ-lab-ripple"
      :points="diamond(wave.origin, ISO)"
    />
    <g
      v-for="ghost in ghosts.values()"
      :key="`ghost-${ghost.id}`"
      class="occ-lab-ghost"
      :transform="placeAt(ghost.at)"
    >
      <PieceShape :role="ghost.role" />
    </g>
    <g v-for="piece in visiblePieces" :key="pieceKey(piece)" :transform="placeAt(piece.at)">
      <g
        :class="[
          'occ-lab-piece',
          `occ-lab-piece--${piece.camp}`,
          {
            'occ-lab-piece--lifted': piece.id === selected,
            'occ-lab-piece--enter': revealed.has(piece.id),
          },
        ]"
        :style="revealed.has(piece.id) ? { '--delay': waveDelay(piece.at) } : undefined"
      >
        <g class="occ-lab-piece__body">
          <PieceShape :role="piece.role" />
        </g>
      </g>
    </g>
    <template v-if="movingPiece !== undefined">
      <g
        v-for="index in trailIndexes"
        :key="`trail-${index}`"
        :ref="(element) => (trails[index] = element as SVGGElement | null)"
        visibility="hidden"
        :class="`occ-lab-piece occ-lab-piece--${movingPiece.camp} occ-lab-piece--trail`"
      >
        <PieceShape :role="movingPiece.role" />
      </g>
      <g
        ref="hop"
        :class="`occ-lab-piece occ-lab-piece--${movingPiece.camp}`"
        :transform="placeAt(movingPiece.at)"
      >
        <PieceShape :role="movingPiece.role" />
      </g>
    </template>
    <g v-for="tile in tiles" :key="`hit-${key(tile)}`" class="occ-lab-cell" @click="click(tile)">
      <polygon class="occ-lab-hit" :points="diamond(tile, ISO)" />
      <polygon class="occ-lab-hover" :points="diamond(tile, ISO)" />
    </g>
  </svg>
</template>
