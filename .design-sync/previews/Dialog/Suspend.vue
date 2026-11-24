<script setup lang="ts">
import { ref } from "vue";
import { ChipGroup, Dialog, Note, TextField } from "@occulis/ui";

const reason = ref("triche répétée");
const days = ref("7");
/** La fenêtre reste ouverte : l'aperçu ne suspend personne. */
const confirm = () => false;
const options = [
  { value: "1", label: "1 jour" },
  { value: "7", label: "7 jours" },
  { value: "30", label: "30 jours" },
  { value: "", label: "définitive" },
];
</script>

<template>
  <Dialog open title="Suspendre anne" confirm-label="Suspendre" danger :on-confirm="confirm">
    <Note>Ses sessions sont fermées tout de suite, et il ne peut plus en ouvrir jusqu'à la levée.</Note>
    <TextField v-model="reason" label="motif (facultatif)" />
    <ChipGroup v-model="days" :options="options" />
    <TextField v-model="days" label="durée en jours" />
  </Dialog>
</template>
