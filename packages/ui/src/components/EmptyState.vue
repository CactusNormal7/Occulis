<script setup lang="ts">
/**
 * Ce qu'une liste ou une vue dit quand elle n'a rien à montrer. L'emplacement `action` porte
 * un geste pour en sortir.
 */
defineProps<{
  /** Le message est une erreur, dans la teinte des refus. */
  error?: boolean | undefined;
}>();
</script>

<template>
  <div :class="['occ-empty', { 'occ-empty--error': error }]">
    <span><slot /></span>
    <slot name="action" />
  </div>
</template>
