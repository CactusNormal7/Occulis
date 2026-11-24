<script setup lang="ts">
import { ref } from "vue";
import { SettingEditor, SettingList, SettingRow, TextField } from "@occulis/ui";

/** Une ligne n'offre « Modifier » que si elle reçoit `onEdit` : l'aperçu n'en fait rien. */
const edit = () => undefined;
const handle = ref("Cactus");
</script>

<template>
  <div style="max-width: 480px">
    <SettingList>
      <SettingRow label="Handle" value="Cactus" :on-edit="edit" editing>
        <SettingEditor submit-label="Save">
          <TextField v-model="handle" label="New handle" name="handle" />
        </SettingEditor>
      </SettingRow>
    </SettingList>
  </div>
</template>
