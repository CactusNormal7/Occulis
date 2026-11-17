<script setup lang="ts">
import { InlineEdit } from "@occulis/ui";

const submit = () => undefined;
</script>

<template>
  <div style="display: grid; gap: 10px; max-width: 560px">
    <InlineEdit label="pseudo" default-value="anne" action="Renommer" :on-submit="submit" />
    <InlineEdit label="adresse" type="email" default-value="anne@occulis.test" action="Changer" :on-submit="submit" />
    <InlineEdit label="mot de passe" type="password" action="Définir" :on-submit="submit" />
  </div>
</template>
