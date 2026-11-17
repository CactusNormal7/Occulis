<script setup lang="ts">
/**
 * Fixe la langue de tout ce qu'il enveloppe, sans rien dessiner. `UiRoot` fait de même
 * quand il reçoit `locale` : ce fournisseur sert là où il n'y a pas de racine à poser.
 */
import type { Locale } from "@occulis/i18n";
import { provideLocale } from "../composables/locale.js";

const props = defineProps<{ locale: Locale }>();

provideLocale(() => props.locale);
</script>

<template>
  <slot />
</template>
