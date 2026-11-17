<script setup lang="ts">
/**
 * Un joueur ou un compte en une ligne : insigne, nom, détail. Le détail est du texte
 * (`detail`), ou des pastilles posées dans l'emplacement `detail`.
 */
import type { Camp } from "../types.js";
import TileAvatar from "./TileAvatar.vue";

defineProps<{
  name: string;
  /** La ligne secondaire : une adresse, une date, un siège. */
  detail?: string | undefined;
  /** Un lien vers la fiche ; sans lui, l'élément n'est pas cliquable. */
  href?: string | undefined;
  camp?: Camp | undefined;
}>();
</script>

<template>
  <component :is="href === undefined ? 'span' : 'a'" class="occ-person" :href="href">
    <TileAvatar :name="name" :camp="camp" />
    <span class="occ-person__text">
      <strong>{{ name }}</strong>
      <small v-if="detail !== undefined || $slots.detail !== undefined">
        <slot name="detail">{{ detail }}</slot>
      </small>
    </span>
  </component>
</template>
