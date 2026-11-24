<script setup lang="ts">
/**
 * Un aperçu, monté sur sa scène, avec son code à la demande. Une fenêtre modale ne s'ouvre
 * qu'à l'appui sur « Ouvrir ».
 */
import { computed, ref } from "vue";
import { Button, CodeBlock, Stage, useMessages } from "@occulis/ui";
import type { Story } from "../sources.js";
import ContainedPreview from "./ContainedPreview.vue";
import OverlayHost from "./OverlayHost.vue";

defineProps<{
  story: Story;
  overlay: boolean;
}>();

const messages = useMessages();
const text = computed(() => messages.value.admin.design.components);
const showCode = ref(false);
const open = ref(false);
</script>

<template>
  <Stage :title="story.name">
    <template #actions>
      <Button v-if="overlay" size="sm" icon="play" @click="open = true">{{ text.open }}</Button>
      <Button size="sm" variant="ghost" @click="showCode = !showCode">
        {{ showCode ? text.hideCode : text.code }}
      </Button>
    </template>

    <ContainedPreview>
      <template v-if="overlay">
        <OverlayHost v-if="open" @close="open = false">
          <component :is="story.Render" />
        </OverlayHost>
      </template>
      <component :is="story.Render" v-else />
    </ContainedPreview>

    <CodeBlock v-if="showCode" :code="story.code" label="vue" />
  </Stage>
</template>
