<script setup lang="ts">
/**
 * Les spans d'une ligne de Markdown. Un lien vers le web s'ouvre ; un lien vers un fichier du
 * dépôt n'a pas d'adresse ici, il reste un nom.
 */
import type { Inline } from "../catalog.js";

defineProps<{ spans: readonly Inline[] }>();

function isWebLink(href: string): boolean {
  return /^https?:\/\//.test(href);
}
</script>

<template>
  <template v-for="(span, index) in spans" :key="index">
    <code v-if="span.kind === 'code'">{{ span.text }}</code>
    <strong v-else-if="span.kind === 'strong'">{{ span.text }}</strong>
    <em v-else-if="span.kind === 'em'">{{ span.text }}</em>
    <template v-else-if="span.kind === 'link'">
      <a v-if="isWebLink(span.href)" :href="span.href" target="_blank" rel="noreferrer">
        {{ span.text }}
      </a>
      <code v-else>{{ span.text }}</code>
    </template>
    <template v-else>{{ span.text }}</template>
  </template>
</template>
