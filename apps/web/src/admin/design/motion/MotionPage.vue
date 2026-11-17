<script setup lang="ts">
/**
 * Les animations, rejouables et ralenties (`speed`, dans les retouches) : l'ouverture des
 * fenêtres, le voile tramé, l'entrée d'un bloc, les composants animés, puis ce qui ne se
 * rejoue pas hors de son écran — le plateau et la page du jeu — par leurs durées et leurs
 * courbes, lues dans leurs sources.
 */
import { CardGrid } from "@occulis/ui";
import { CHARTER_ANIMATIONS, GAME_ANIMATIONS } from "../sources.js";
import BlockEntrance from "./BlockEntrance.vue";
import BoardMotion from "./BoardMotion.vue";
import CountdownDemo from "./CountdownDemo.vue";
import DeclaredAnimations from "./DeclaredAnimations.vue";
import OpponentReveal from "./OpponentReveal.vue";
import VeilReplay from "./VeilReplay.vue";
import WindowOpening from "./WindowOpening.vue";
</script>

<template>
  <WindowOpening />
  <VeilReplay />
  <CardGrid>
    <BlockEntrance />
    <CountdownDemo />
  </CardGrid>
  <OpponentReveal />
  <BoardMotion />
  <DeclaredAnimations kind="game" :animations="GAME_ANIMATIONS" />
  <DeclaredAnimations kind="charter" :animations="CHARTER_ANIMATIONS" />
</template>
