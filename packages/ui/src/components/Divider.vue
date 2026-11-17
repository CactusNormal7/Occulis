<script setup lang="ts">
/** Un séparateur horizontal, avec un mot au milieu (« ou »). */
</script>

<template>
  <div class="occ-divider" role="separator">
    <span v-if="$slots.default !== undefined"><slot /></span>
  </div>
</template>
