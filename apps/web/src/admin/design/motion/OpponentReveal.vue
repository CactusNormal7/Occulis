<script setup lang="ts">
/** L'annonce de l'adversaire, montée depuis son propre aperçu et rejouée en la remontant. */
import { computed, ref } from "vue";
import { Button, Card, Stage, useMessages } from "@occulis/ui";
import { COMPONENTS } from "../sources.js";

const messages = useMessages();
const text = computed(() => messages.value.admin.design.motion.animated);
const announcement = COMPONENTS.find((entry) => entry.name === "Reveal")?.stories[0]?.Render;
/** Change à chaque appui : la clé neuve remonte l'annonce, qui rejoue son entrée. */
const round = ref(0);
</script>

<template>
  <Card v-if="announcement !== undefined" :title="text.reveal">
    <template #action>
      <Button size="sm" icon="play" @click="round += 1">{{ text.restart }}</Button>
    </template>
    <Stage>
      <component :is="announcement" :key="round" />
    </Stage>
  </Card>
</template>
