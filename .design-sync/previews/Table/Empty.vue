<script setup lang="ts">
import { Table } from "@occulis/ui";
</script>

<template>
  <Table :columns="['partie', 'résultat']" :row-count="0" empty="Aucune partie." />
</template>
