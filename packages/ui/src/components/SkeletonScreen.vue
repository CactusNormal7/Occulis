<script setup lang="ts">
/**
 * La place d'un **écran entier** pendant une navigation : la barre du haut a déjà changé
 * d'onglet, l'écran suivant n'est pas encore arrivé. Il paraît aussitôt, en fondu depuis
 * le transparent : une réponse rapide le remplace avant qu'il soit visible, une réponse
 * lente montre la forme de ce qui vient au lieu de l'écran qu'on vient de quitter.
 */
import { useMessages } from "../composables/locale.js";
import type { SkeletonLayout } from "../types.js";
import SkeletonLines from "./SkeletonLines.vue";

withDefaults(defineProps<{ layout?: SkeletonLayout }>(), { layout: "list" });

const messages = useMessages();
</script>

<template>
  <div class="occ-skeleton-screen" role="status" aria-busy="true" :aria-label="messages.ui.loading">
    <template v-if="layout === 'hero'">
      <div class="occ-skeleton-screen__hero">
        <span class="occ-skeleton__tile" />
        <SkeletonLines :lines="2" />
      </div>
      <div class="occ-card-grid">
        <div class="occ-card-column">
          <SkeletonLines :lines="4" card />
          <SkeletonLines :lines="3" card />
        </div>
        <div class="occ-card-column">
          <SkeletonLines :lines="5" card />
        </div>
      </div>
    </template>

    <template v-else-if="layout === 'list'">
      <span class="occ-skeleton__title" />
      <SkeletonLines :lines="8" card />
    </template>

    <template v-else>
      <SkeletonLines :lines="2" card />
      <span class="occ-skeleton__area" />
    </template>
  </div>
</template>
