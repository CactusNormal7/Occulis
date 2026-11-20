<script setup lang="ts">
import { Badge, BadgeRow, Card, List, ListRow, Person } from "@occulis/ui";
</script>

<template>
  <Card title="Derniers inscrits">
    <template #action>
      <a href="#">tout voir</a>
    </template>
    <List>
      <ListRow>
        <Person name="Cactus" detail="2026-10-04 14:44" href="#" />
        <template #end>
          <BadgeRow>
            <Badge tone="strong">admin</Badge>
            <Badge>vérifiée</Badge>
          </BadgeRow>
        </template>
      </ListRow>
      <ListRow>
        <Person name="anne" detail="2026-10-03 09:12" href="#" />
        <template #end>
          <Badge tone="dim">non vérifiée</Badge>
        </template>
      </ListRow>
    </List>
  </Card>
</template>
