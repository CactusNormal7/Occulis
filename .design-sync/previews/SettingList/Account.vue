<script setup lang="ts">
import { Button, SettingList, SettingRow } from "@occulis/ui";

/** Une ligne n'offre « Modifier » que si elle reçoit `onEdit` : l'aperçu n'en fait rien. */
const edit = () => undefined;
</script>

<template>
  <div style="max-width: 480px">
    <SettingList>
      <SettingRow label="Handle" value="Cactus" description="Visible to your opponents. Once every 30 days." :on-edit="edit" />
      <SettingRow label="Email address" value="anne@occulis.test" description="Verified." :on-edit="edit" />
      <SettingRow label="Password" value="••••••••••" edit-label="Change" :on-edit="edit" />
      <SettingRow label="Google" value="Not linked">
        <template #action><Button size="sm">Link</Button></template>
      </SettingRow>
    </SettingList>
  </div>
</template>
