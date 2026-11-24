<script setup lang="ts">
/**
 * La barre du haut, celle du HUD des maquettes : marque, onglets en capitales soulignés
 * au trait, identité à droite (emplacement `end`). Elle reste collée en haut au défilement.
 */
import type { TopBarTab } from "../types.js";
import Wordmark from "./Wordmark.vue";

withDefaults(
  defineProps<{
    /** Le nom de l'écran, sous la marque. */
    section?: string | undefined;
    brandHref?: string | undefined;
    tabs?: readonly TopBarTab[] | undefined;
  }>(),
  { tabs: () => [] },
);
</script>

<template>
  <header class="occ-top-bar">
    <Wordmark :section="section" :href="brandHref" />
    <nav v-if="tabs.length > 0" class="occ-top-bar__tabs">
      <a
        v-for="tab in tabs"
        :key="tab.href"
        :href="tab.href"
        :aria-current="tab.current === true ? 'page' : undefined"
      >
        {{ tab.label }}
      </a>
    </nav>
    <div v-if="$slots.end !== undefined" class="occ-top-bar__end">
      <slot name="end" />
    </div>
  </header>
</template>
