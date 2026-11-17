<script setup lang="ts">
import { Pager } from "@occulis/ui";

const hrefFor = (offset: number) => `#/users?offset=${offset}`;
</script>

<template>
  <div style="padding: 8px">
    <Pager :offset="25" :shown="25" :total="132" :page-size="25" :href-for="hrefFor" />
  </div>
</template>
