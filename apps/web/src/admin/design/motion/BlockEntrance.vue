<script setup lang="ts">
/** L'entrée d'un bloc (`occ-enter`), rejouée en remontant le bloc. */
import { computed, ref } from "vue";
import { Button, Card, Note, Stage, useMessages } from "@occulis/ui";

const messages = useMessages();
const text = computed(() => messages.value.admin.design.motion.enter);
/** Change à chaque appui : la clé neuve remonte le bloc, qui rejoue son entrée. */
const round = ref(0);
</script>

<template>
  <Card :title="text.title">
    <template #action>
      <Button size="sm" icon="play" @click="round += 1">{{ text.replay }}</Button>
    </template>
    <Note>{{ text.text }}</Note>
    <Stage>
      <div :key="round" class="occ-enter">
        <Card>
          <Note>{{ text.sample }}</Note>
        </Card>
      </div>
    </Stage>
  </Card>
</template>
