<script setup lang="ts">
/** Les animations qu'une feuille déclare — celle du jeu ou celle de la charte —, règle par règle. */
import { computed } from "vue";
import { Card, Note, Table, useMessages } from "@occulis/ui";
import type { CssAnimation } from "../catalog.js";

const props = defineProps<{
  kind: "game" | "charter";
  animations: readonly CssAnimation[];
}>();

const messages = useMessages();
const text = computed(() => messages.value.admin.design.motion);
const sheet = computed(() => text.value[props.kind]);
</script>

<template>
  <Card :title="sheet.title">
    <Note>{{ sheet.text }}</Note>
    <Table
      :columns="[text.columns.selector, text.columns.animation, text.columns.note]"
      :row-count="animations.length"
    >
      <tr v-for="(animation, index) in animations" :key="`${animation.selector}-${index}`">
        <td>
          <code>{{ animation.selector }}</code>
        </td>
        <td>
          <code>{{ animation.animation }}</code>
        </td>
        <td>{{ animation.note }}</td>
      </tr>
    </Table>
  </Card>
</template>
