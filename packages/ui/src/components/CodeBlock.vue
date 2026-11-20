<script setup lang="ts">
/**
 * Du code, tel quel : monospace, sans retour forcé, défilant s'il déborde. Une des briques
 * de la vitrine de la charte (le design system du back-office).
 */
defineProps<{
  code: string;
  /** Un nom au-dessus du bloc : le fichier, le langage. */
  label?: string | undefined;
}>();
</script>

<template>
  <figure class="occ-code">
    <figcaption v-if="label !== undefined" class="occ-label">{{ label }}</figcaption>
    <pre class="occ-code__body"><code>{{ code }}</code></pre>
  </figure>
</template>
