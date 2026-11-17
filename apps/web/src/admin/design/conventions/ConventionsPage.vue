<script setup lang="ts">
/**
 * Les conventions : celles que lit l'agent de Claude Design (`.design-sync/conventions.md`),
 * et la direction artistique du design doc (section 8.1), d'où viennent les décisions.
 */
import { computed } from "vue";
import { Card, Note, useMessages } from "@occulis/ui";
import { ART_DIRECTION, CONVENTIONS } from "../sources.js";
import MarkdownView from "./MarkdownView.vue";

const messages = useMessages();
const text = computed(() => messages.value.admin.design.conventions);
</script>

<template>
  <Card :title="text.agent">
    <template #action>
      <code>.design-sync/conventions.md</code>
    </template>
    <MarkdownView :source="CONVENTIONS" />
  </Card>
  <Card :title="text.direction">
    <template #action>
      <code>docs/design.md · 8.1</code>
    </template>
    <Note>{{ text.sourceNote }}</Note>
    <MarkdownView :source="ART_DIRECTION" />
  </Card>
</template>
