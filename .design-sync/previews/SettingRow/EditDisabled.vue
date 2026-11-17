<script setup lang="ts">
import { SettingList, SettingRow } from "@occulis/ui";

/** Une ligne n'offre « Modifier » que si elle reçoit `onEdit` : l'aperçu n'en fait rien. */
const edit = () => undefined;
</script>

<template>
  <div style="max-width: 480px">
    <SettingList>
      <SettingRow label="Handle" value="Cactus" description="Changeable again on 11 November." :on-edit="edit" edit-disabled />
    </SettingList>
  </div>
</template>
