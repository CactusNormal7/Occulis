<script setup lang="ts">
import { SettingList, SettingRow } from "@occulis/ui";

/** Une ligne n'offre « Modifier » que si elle reçoit `onEdit` : l'aperçu n'en fait rien. */
const edit = () => undefined;
</script>

<template>
  <div style="max-width: 480px">
    <SettingList>
      <SettingRow label="Handle" value="Cactus" description="Visible to your opponents. Once every 30 days." :on-edit="edit" />
    </SettingList>
  </div>
</template>
