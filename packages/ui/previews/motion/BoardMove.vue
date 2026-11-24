<script setup lang="ts">
/** Prototype 1 : un coup sur le plateau. */
import { ref } from "vue";
import { Button, Stage } from "../../src/index.js";
import type { Role } from "../board-mock.js";
import BoardPrototype from "../board/BoardPrototype.vue";
import PieceIcon from "../board/PieceIcon.vue";

const ROLES: readonly { role: Role; label: string }[] = [
  { role: "master", label: "King — eye on a mast" },
  { role: "ability", label: "Ability — lozenge and spike" },
  { role: "pawn", label: "Pawn — short leaning mast" },
];

/** Chaque remise à zéro remonte le plateau, revenu à sa position de départ. */
const round = ref(0);
</script>

<template>
  <Stage title="Prototype 1 · A move on the board — select, hop, line of sight">
    <template #actions>
      <Button size="sm" variant="ghost" @click="round += 1">Reset</Button>
    </template>
    <p class="occ-lab-note">
      Click a teal piece: it lifts, its destinations open in a cascade. Click a destination: an arc
      with afterimages, a ripple on landing, then the line of sight unfolds as a wave from the
      landing tile. An enemy entering sight materialises; one leaving it leaves a dotted ghost.
      Calm: lower arc, no trail. Still: the piece fades across, fog cross-fades at once.
    </p>
    <BoardPrototype :key="round" label="Prototype board: camp A to move" />
    <div class="occ-lab-legend">
      <figure v-for="{ role, label } in ROLES" :key="role">
        <div class="occ-lab-row">
          <PieceIcon :role="role" camp="A" />
          <PieceIcon :role="role" camp="B" />
        </div>
        <figcaption class="occ-label">{{ label }}</figcaption>
      </figure>
    </div>
  </Stage>
</template>
