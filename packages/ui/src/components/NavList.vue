<script setup lang="ts">
/** Une navigation par sections, en colonne : la table des matières d'un catalogue. */
import type { NavSection } from "../types.js";

defineProps<{
  sections: readonly NavSection[];
  label?: string | undefined;
}>();
</script>

<template>
  <nav class="occ-navlist" :aria-label="label">
    <div v-for="section in sections" :key="section.label" class="occ-navlist__section">
      <h4 class="occ-label">{{ section.label }}</h4>
      <ul>
        <li v-for="item in section.items" :key="item.href">
          <a :href="item.href" :aria-current="item.current === true ? 'page' : undefined">
            {{ item.label }}
          </a>
        </li>
      </ul>
    </div>
  </nav>
</template>
