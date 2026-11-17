<script setup lang="ts">
import { Badge, BadgeRow, IconButton, Person, QuickBar, Table } from "@occulis/ui";
</script>

<template>
  <Table :columns="['compte', 'état', 'inscription', '']" :row-count="2">
    <tr>
      <td><Person name="anne" detail="anne@occulis.test" href="#" /></td>
      <td>
        <BadgeRow><Badge>vérifiée</Badge></BadgeRow>
      </td>
      <td class="occ-muted">2026-10-03 09:12</td>
      <td class="occ-actions-cell">
        <QuickBar>
          <IconButton icon="ban" label="Suspendre" danger />
          <IconButton icon="trash" label="Supprimer le compte" danger />
        </QuickBar>
      </td>
    </tr>
    <tr>
      <td><Person name="bruno" detail="bruno@occulis.test" href="#" /></td>
      <td>
        <BadgeRow>
          <Badge tone="dim">non vérifiée</Badge>
          <Badge tone="refused">suspendu</Badge>
        </BadgeRow>
      </td>
      <td class="occ-muted">2026-09-28 21:40</td>
      <td class="occ-actions-cell">
        <QuickBar>
          <IconButton icon="unban" label="Lever la suspension" />
          <IconButton icon="trash" label="Supprimer le compte" danger />
        </QuickBar>
      </td>
    </tr>
  </Table>
</template>
