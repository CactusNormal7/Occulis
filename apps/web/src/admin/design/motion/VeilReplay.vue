<script setup lang="ts">
/**
 * Le voile du changement de thème, rejoué tel quel : la même classe, la même feuille
 * (`ui/veil.css`), posée sur la page et retirée à la fin de son animation — ralentie avec
 * les autres par les retouches.
 */
import { computed } from "vue";
import { Badge, Button, Card, CodeBlock, Note, Stage, useMessages } from "@occulis/ui";
import veilCss from "../../../ui/veil.css?raw";
import "../../../ui/veil.css";

const messages = useMessages();
const text = computed(() => messages.value.admin.design.motion.veil);

function replay() {
  const veil = document.createElement("div");
  veil.className = "theme-veil";
  veil.addEventListener("animationend", () => veil.remove());
  document.body.append(veil);
}
</script>

<template>
  <Card :title="text.title">
    <template #action>
      <Badge tone="strong">{{ text.locked }}</Badge>
    </template>
    <Note>{{ text.text }}</Note>
    <Stage>
      <template #actions>
        <Button size="sm" icon="play" @click="replay">{{ text.replay }}</Button>
      </template>
      <CodeBlock label="apps/web/src/ui/veil.css" :code="veilCss.trim()" />
    </Stage>
  </Card>
</template>
