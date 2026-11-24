<script setup lang="ts">
/** Chantier 4 : les trois prototypes d'animation les plus structurants. */
import BoardMove from "./BoardMove.vue";
import QueueWait from "./QueueWait.vue";
import ScreenThreshold from "./ScreenThreshold.vue";
</script>

<template>
  <section id="motion" class="occ-lab-section">
    <header>
      <h2 class="occ-label">4 · Interface motion — three prototypes</h2>
      <p>
        The full inventory (every screen, its intent, its priority) is in
        docs/design/refonte-graphique.md. These three set the vocabulary the others reuse: the board
        move, the screen threshold, the wait.
      </p>
    </header>
    <BoardMove />
    <ScreenThreshold />
    <QueueWait />
  </section>
</template>
