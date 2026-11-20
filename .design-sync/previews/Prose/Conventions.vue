<script setup lang="ts">
import { CodeBlock, Prose } from "@occulis/ui";
</script>

<template>
  <Prose>
    <h2>Setup</h2>
    <p>
      Wrap every screen in <code>UiRoot</code>. Without it, components fall back to the host page's font and
      background.
    </p>
    <ul>
      <li><strong>Sharp lines.</strong> Frames are one pixel at low alpha.</li>
      <li><strong>Colour means game information only.</strong></li>
    </ul>
    <CodeBlock label="vue" code="<UiRoot full-page>…</UiRoot>" />
  </Prose>
</template>
