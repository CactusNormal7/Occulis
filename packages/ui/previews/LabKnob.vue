<script setup lang="ts">
/** Un réglage de la barre du labo : un libellé au-dessus de son contrôle. */
defineProps<{ label: string }>();
</script>

<template>
  <label class="occ-lab-knob">
    <span class="occ-label">{{ label }}</span>
    <slot />
  </label>
</template>
