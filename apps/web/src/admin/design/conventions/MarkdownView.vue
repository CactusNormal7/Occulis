<script setup lang="ts">
/** Un document Markdown, découpé par `markdownBlocks` et rendu avec les briques de la charte. */
import { computed } from "vue";
import { CodeBlock, Prose } from "@occulis/ui";
import { markdownBlocks } from "../catalog.js";
import InlineSpans from "./InlineSpans.vue";

const props = defineProps<{ source: string }>();

const blocks = computed(() => markdownBlocks(props.source));

/** Le titre HTML d'un niveau Markdown : la page n'en montre que trois. */
function headingTag(level: number): "h1" | "h2" | "h3" {
  if (level <= 1) return "h1";
  return level === 2 ? "h2" : "h3";
}
</script>

<template>
  <Prose>
    <template v-for="(block, index) in blocks" :key="index">
      <component :is="headingTag(block.level)" v-if="block.kind === 'heading'">
        <InlineSpans :spans="block.text" />
      </component>
      <p v-else-if="block.kind === 'paragraph'">
        <InlineSpans :spans="block.text" />
      </p>
      <component :is="block.ordered ? 'ol' : 'ul'" v-else-if="block.kind === 'list'">
        <li v-for="(item, itemIndex) in block.items" :key="itemIndex">
          <InlineSpans :spans="item" />
        </li>
      </component>
      <CodeBlock
        v-else
        :code="block.text"
        :label="block.language.length > 0 ? block.language : undefined"
      />
    </template>
  </Prose>
</template>
