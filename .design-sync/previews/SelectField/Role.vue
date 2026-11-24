<script setup lang="ts">
import { ref } from "vue";
import { SelectField } from "@occulis/ui";

const role = ref("user");
const options = [
  { value: "user", label: "joueur" },
  { value: "admin", label: "administrateur" },
];
</script>

<template>
  <div style="max-width: 320px">
    <SelectField v-model="role" label="Rôle" :options="options" />
  </div>
</template>
