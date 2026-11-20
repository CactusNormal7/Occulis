<script setup lang="ts">
import { IconButton, List, ListRow } from "@occulis/ui";
</script>

<template>
  <List>
    <ListRow>
      <strong>Chrome · Windows</strong>
      <small>127.0.0.1 · ouverte le 2026-10-04 16:25 · expire le 2026-10-11 16:25</small>
      <template #end>
        <IconButton icon="close" label="Fermer cette session" tip-align="end" />
      </template>
    </ListRow>
    <ListRow>
      <strong>Firefox · Linux</strong>
      <small>192.168.1.12 · ouverte le 2026-10-02 08:03 · expire le 2026-10-09 08:03</small>
      <template #end>
        <IconButton icon="close" label="Fermer cette session" tip-align="end" />
      </template>
    </ListRow>
  </List>
</template>
