<script setup lang="ts">
/**
 * La plaque d'un joueur à l'annonce d'une partie : insigne, nom, chiffres, et dans
 * l'emplacement `badges` les distinctions exhibées, en pastilles.
 */
import type { Camp } from "../types.js";
import TileAvatar from "./TileAvatar.vue";

withDefaults(
  defineProps<{
    name: string;
    /** Le camp tenu, dans sa couleur : c'est une information de partie. */
    camp: Camp;
    /** Une étiquette au-dessus du nom : « Vous », un rang. */
    tag?: string | undefined;
    /** Les lignes sous le nom : l'Elo, le bilan. */
    lines?: readonly string[] | undefined;
    /** `end` aligne la plaque à droite, en miroir — celle de l'adversaire. */
    align?: "start" | "end" | undefined;
  }>(),
  { lines: () => [], align: "start" },
);
</script>

<template>
  <section :class="['occ-plate', `occ-plate--${camp}`, { 'occ-plate--end': align === 'end' }]">
    <TileAvatar :name="name" size="lg" :camp="camp" />
    <div class="occ-plate__text">
      <span v-if="tag !== undefined" class="occ-plate__tag">{{ tag }}</span>
      <strong class="occ-plate__name">{{ name }}</strong>
      <small v-for="(line, index) in lines" :key="index">{{ line }}</small>
      <div v-if="$slots.badges !== undefined" class="occ-plate__badges">
        <slot name="badges" />
      </div>
    </div>
  </section>
</template>
