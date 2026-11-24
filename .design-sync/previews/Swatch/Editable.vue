<script setup lang="ts">
import { Swatch } from "@occulis/ui";

/** Une teinte n'est modifiable que si elle reçoit `onChange` : l'aperçu n'en fait rien. */
const change = () => undefined;
</script>

<template>
  <Swatch name="camp.B" color="var(--occ-camp-b)" value="camp B" edited :on-change="change" />
</template>
