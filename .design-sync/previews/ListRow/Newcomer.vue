<script setup lang="ts">
import { Badge, List, ListRow, Person } from "@occulis/ui";
</script>

<template>
  <List>
    <ListRow>
      <Person name="anne" detail="2026-10-03 09:12" href="#" />
      <template #end>
        <Badge tone="dim">non vérifiée</Badge>
      </template>
    </ListRow>
  </List>
</template>
