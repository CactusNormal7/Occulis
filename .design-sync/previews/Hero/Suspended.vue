<script setup lang="ts">
import { Badge, BadgeRow, Hero, TileAvatar } from "@occulis/ui";
</script>

<template>
  <Hero title="bruno">
    <template #avatar><TileAvatar name="bruno" size="lg" /></template>
    <template #badges>
      <BadgeRow>
        <Badge tone="dim">non vérifiée</Badge>
        <Badge tone="refused">suspendu</Badge>
      </BadgeRow>
    </template>
    <template #meta>
      <span>bruno@occulis.test</span>
      <span>inscrit le 2026-09-28 21:40</span>
    </template>
  </Hero>
</template>
