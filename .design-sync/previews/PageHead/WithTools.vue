<script setup lang="ts">
import { Button, PageHead, SearchField } from "@occulis/ui";
</script>

<template>
  <PageHead title="Comptes" :count="132">
    <template #tools>
      <SearchField placeholder="Pseudo ou adresse…" />
      <Button icon="plus">Nouveau compte</Button>
    </template>
  </PageHead>
</template>
