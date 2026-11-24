<script setup lang="ts">
/** La fiche d'un composant : son commentaire, ses aperçus et son contrat. */
import { computed } from "vue";
import { Badge, Card, CodeBlock, EmptyState, Note, Prose, useMessages } from "@occulis/ui";
import type { ComponentEntry } from "../sources.js";
import StoryStage from "./StoryStage.vue";

const props = defineProps<{ entry: ComponentEntry }>();

const messages = useMessages();
const text = computed(() => messages.value.admin.design.components);

/** Une fenêtre modale ne se monte qu'à la demande : elle couvrirait la page. */
const overlay = computed(() => props.entry.category === "Overlays");

/** Les paragraphes du commentaire, chacun sur une ligne. */
const paragraphs = computed(() =>
  props.entry.doc
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\n/g, " "))
    .filter((paragraph) => paragraph.length > 0),
);
</script>

<template>
  <Card :title="entry.name">
    <template #action>
      <Badge tone="dim">{{ entry.category }}</Badge>
    </template>
    <Prose>
      <p v-if="paragraphs.length === 0">{{ text.noDoc }}</p>
      <template v-else>
        <p v-for="(paragraph, index) in paragraphs" :key="index">{{ paragraph }}</p>
      </template>
    </Prose>
    <Note v-if="entry.file !== undefined">
      {{ text.source(`packages/ui/src/components/${entry.file}`) }}
    </Note>
    <Note v-if="overlay">{{ text.overlayHint }}</Note>
  </Card>

  <EmptyState v-if="entry.stories.length === 0">{{ text.noStory }}</EmptyState>
  <template v-else>
    <StoryStage
      v-for="story in entry.stories"
      :key="story.name"
      :story="story"
      :overlay="overlay"
    />
  </template>

  <Card v-if="entry.contract !== undefined" :title="text.props">
    <CodeBlock :code="entry.contract" :label="entry.file" />
  </Card>
</template>
