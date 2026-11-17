<script setup lang="ts">
/**
 * Une table dense : en-têtes en petites capitales, lignes séparées d'un trait presque
 * invisible, survol estompé. Les actions de ligne ne s'affichent pleinement qu'au survol.
 *
 * Le contenu est fait de `<tr>`, dont la dernière cellule peut porter
 * `class="occ-actions-cell"`. Sans ligne, la table cède la place à `empty`.
 */
import { useMessages } from "../composables/locale.js";
import EmptyState from "./EmptyState.vue";

withDefaults(
  defineProps<{
    /** Les en-têtes de colonne ; une chaîne vide pour la colonne d'actions. */
    columns: readonly string[];
    /** Les rangs (à partir de 0) des colonnes centrées, en-tête comprise. */
    centered?: readonly number[] | undefined;
    /** Le nombre de lignes ; à zéro, la table cède la place à `empty`. */
    rowCount: number;
    empty?: string | undefined;
  }>(),
  { centered: () => [] },
);

const messages = useMessages();
</script>

<template>
  <EmptyState v-if="rowCount === 0">{{ empty ?? messages.ui.empty }}</EmptyState>
  <div v-else class="occ-table-scroll">
    <table class="occ-table">
      <thead>
        <tr>
          <th
            v-for="(column, index) in columns"
            :key="index"
            :class="{ 'occ-center': centered.includes(index) }"
          >
            {{ column }}
          </th>
        </tr>
      </thead>
      <tbody>
        <slot />
      </tbody>
    </table>
  </div>
</template>
