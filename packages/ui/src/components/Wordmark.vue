<script setup lang="ts">
/** Le cube filaire du menu, le mot-symbole estompé, puis le nom de l'écran. */
import Icon from "./Icon.vue";

defineProps<{
  /** Le nom de l'écran, après le séparateur : « back-office », « partie »… */
  section?: string | undefined;
  href?: string | undefined;
}>();
</script>

<template>
  <component :is="href === undefined ? 'span' : 'a'" class="occ-wordmark" :href="href">
    <Icon name="cube" :size="20" />
    <span class="occ-wordmark__name">Occulis</span>
    <span v-if="section !== undefined" class="occ-wordmark__section">{{ section }}</span>
  </component>
</template>
