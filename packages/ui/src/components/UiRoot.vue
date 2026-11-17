<script setup lang="ts">
/**
 * La racine de toute interface Occulis : encre, police pixel et taille de base, et le fond
 * pour une page entière. Sans elle, les composants restent fonctionnels mais héritent de
 * la typographie et du fond de la page hôte.
 */
import type { Locale } from "@occulis/i18n";
import { provideLocale } from "../composables/locale.js";

const props = defineProps<{
  /** Couvre la fenêtre entière (une page) plutôt que son seul contenu (un encart). */
  fullPage?: boolean | undefined;
  /** La langue des textes ; sans elle, celle d'une racine englobante, sinon l'anglais. */
  locale?: Locale | undefined;
}>();

provideLocale(() => props.locale);
</script>

<template>
  <div :class="['occ-root', { 'occ-root--page': fullPage }]" :lang="locale">
    <slot />
  </div>
</template>
