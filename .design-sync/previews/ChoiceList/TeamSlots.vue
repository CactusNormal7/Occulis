<script setup lang="ts">
import { Badge, ChoiceList, ChoiceRow } from "@occulis/ui";

/** Une ligne n'est choisissable que si elle reçoit `onSelect` : l'aperçu n'en fait rien. */
const select = () => undefined;
</script>

<template>
  <ChoiceList label="Team">
    <ChoiceRow selected camp="A" :on-select="select">
      <strong>Commander</strong>
      <small>moves 3 · sees 14</small>
      <template #end><Badge>0,9</Badge></template>
    </ChoiceRow>
    <ChoiceRow :on-select="select">
      <strong>Scout</strong>
      <small>moves 6 · sees 20</small>
      <template #end><Badge>1,7</Badge></template>
    </ChoiceRow>
    <ChoiceRow muted :on-select="select">
      <strong>Pawn</strong>
      <small>moves 1 · sees 6</small>
      <template #end><Badge tone="dim">not placed</Badge></template>
    </ChoiceRow>
  </ChoiceList>
</template>
