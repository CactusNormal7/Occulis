<script setup lang="ts">
import { CodeBlock } from "@occulis/ui";

const code = `<UiRoot full-page>
  <main class="occ-page">
    <Card title="Matches">…</Card>
  </main>
</UiRoot>`;
</script>

<template>
  <CodeBlock label="vue" :code="code" />
</template>
