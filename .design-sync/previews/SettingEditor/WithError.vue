<script setup lang="ts">
import { ref } from "vue";
import { SettingEditor, TextField } from "@occulis/ui";

const handle = ref("boris");
</script>

<template>
  <div style="max-width: 420px">
    <SettingEditor submit-label="Save" error="This handle is already taken.">
      <TextField v-model="handle" label="New handle" name="handle" />
    </SettingEditor>
  </div>
</template>
