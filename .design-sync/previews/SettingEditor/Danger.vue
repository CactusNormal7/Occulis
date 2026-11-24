<script setup lang="ts">
import { ref } from "vue";
import { SettingEditor, TextField } from "@occulis/ui";

const confirmation = ref("");
</script>

<template>
  <div style="max-width: 420px">
    <SettingEditor
      submit-label="Send the deletion link"
      danger
      note="The link expires in one hour. Your match history is anonymised, not erased."
    >
      <TextField v-model="confirmation" label="Type your handle to confirm" name="confirm" />
    </SettingEditor>
  </div>
</template>
