<script setup lang="ts">
/** L'inversion qui suit le contour d'une zone du plateau, depuis la case cliquée. */
import { shallowRef } from "vue";
import {
  PaperInversion,
  diamond,
  unproject,
  type PaperRun,
  type Tile,
} from "../../src/lab/index.js";
import { COLUMNS, ROWS, START, allTiles, isWall, key, visibleTo } from "../board-mock.js";
import { ISO, VIEW, placeAt } from "../board/iso.js";
import PieceShape from "../board/PieceShape.vue";

defineProps<{ blend: "cover" | "invert" }>();

// La zone montrée : ce que voit le camp A au départ — la ligne de vue est l'usage le plus
// probable d'un effet qui suit le contour d'une zone.
const seen = visibleTo("A", START);
const zone = allTiles().filter((tile) => seen.has(key(tile)) && !isWall(tile));
const zoneKeys = new Set(zone.map(key));
const tiles = allTiles();
const ownPieces = START.filter((piece) => piece.camp === "A");

const run = shallowRef<PaperRun | null>(null);

function start(event: MouseEvent) {
  const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
  // Le SVG est mis à l'échelle de sa boîte : la projection du shader doit l'être aussi.
  const ratio = box.width / VIEW.width;
  const tile: Tile = unproject(
    (event.clientX - box.left) / ratio,
    (event.clientY - box.top) / ratio,
    ISO,
  );
  if (!zoneKeys.has(key(tile))) return;
  run.value = {
    key: Date.now(),
    source: {
      kind: "zone",
      zone,
      origin: tile,
      columns: COLUMNS,
      rows: ROWS,
      iso: {
        originX: ISO.originX * ratio,
        originY: ISO.originY * ratio,
        tileWidth: ISO.tileWidth * ratio,
        tileHeight: ISO.tileHeight * ratio,
      },
    },
  };
}
</script>

<template>
  <div
    class="occ-lab-screen occ-lab-screen--clickable"
    :style="{ aspectRatio: `${VIEW.width} / ${VIEW.height}` }"
    @click="start"
  >
    <svg class="occ-lab-board" :viewBox="`0 0 ${VIEW.width} ${VIEW.height}`" aria-hidden="true">
      <polygon
        v-for="tile in tiles"
        :key="key(tile)"
        :class="zoneKeys.has(key(tile)) ? 'occ-lab-tile' : 'occ-lab-wall__right'"
        :points="diamond(tile, ISO)"
      />
      <g
        v-for="piece in ownPieces"
        :key="piece.id"
        class="occ-lab-piece occ-lab-piece--A"
        :transform="placeAt(piece.at)"
      >
        <PieceShape :role="piece.role" />
      </g>
    </svg>
    <PaperInversion :run="run" :blend="blend" />
  </div>
</template>
