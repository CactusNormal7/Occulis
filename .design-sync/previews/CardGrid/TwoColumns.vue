<script setup lang="ts">
import { Card, CardGrid, Stat, StatGrid } from "@occulis/ui";
</script>

<template>
  <CardGrid>
    <Card title="Profil de jeu">
      <StatGrid>
        <Stat :value="18" label="parties" />
        <Stat :value="11" label="victoires" />
        <Stat :value="7" label="défaites" />
      </StatGrid>
    </Card>
    <Card title="Sessions ouvertes (1)">
      <p class="occ-muted" style="margin: 0">Chrome · Windows — 127.0.0.1</p>
    </Card>
  </CardGrid>
</template>
