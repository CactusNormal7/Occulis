<script setup lang="ts">
import { ref } from "vue";
import { SettingEditor, TextField } from "@occulis/ui";

const handle = ref("Cactus");
</script>

<template>
  <div style="max-width: 420px">
    <SettingEditor submit-label="Save" note="You can change it again in 30 days.">
      <TextField v-model="handle" label="New handle" name="handle" />
    </SettingEditor>
  </div>
</template>
