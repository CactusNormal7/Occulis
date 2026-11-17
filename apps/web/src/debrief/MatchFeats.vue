<script setup lang="ts">
/** Les faits d'armes de la partie : factices tant qu'ils ne sont pas calculés par partie. */
import { computed } from "vue";
import { Card, ChoiceList, ChoiceRow, Note, WorkInProgress, useMessages } from "@occulis/ui";
import { PLACEHOLDER } from "./model.js";

const messages = useMessages();
const text = computed(() => messages.value.game.debrief.feats);
</script>

<template>
  <WorkInProgress :note="text.placeholder">
    <Card :title="text.title">
      <Note>{{ text.lead }}</Note>
      <ChoiceList :label="text.title">
        <ChoiceRow v-for="id in PLACEHOLDER.feats" :key="id">
          <strong>{{ messages.feats.names[id] ?? id }}</strong>
          <small>{{ messages.feats.descriptions[id] ?? "" }}</small>
        </ChoiceRow>
      </ChoiceList>
    </Card>
  </WorkInProgress>
</template>
