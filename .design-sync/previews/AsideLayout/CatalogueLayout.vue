<script setup lang="ts">
import { AsideLayout, Card, NavList, Note } from "@occulis/ui";

const sections = [
  {
    label: "Foundations",
    items: [
      { href: "#tokens", label: "Tokens", current: true },
      { href: "#motion", label: "Motion" },
    ],
  },
];
</script>

<template>
  <AsideLayout>
    <template #aside>
      <Card title="Sections">
        <NavList :sections="sections" />
      </Card>
    </template>
    <Card title="Tokens">
      <Note>The content column takes the remaining width; the aside stays in view while it scrolls.</Note>
    </Card>
  </AsideLayout>
</template>
