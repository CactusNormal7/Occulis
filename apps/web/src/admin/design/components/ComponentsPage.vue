<script setup lang="ts">
/**
 * Le catalogue des composants : la navigation par catégorie, et pour le composant choisi son
 * commentaire, chacun de ses aperçus **monté en vrai** avec son code, et son contrat — tels que
 * la synchronisation les envoie à Claude Design.
 */
import { computed } from "vue";
import { AsideLayout, Card, EmptyState, NavList, useMessages, type NavSection } from "@occulis/ui";
import { routeHash } from "../../model.js";
import { COMPONENTS } from "../sources.js";
import ComponentDetail from "./ComponentDetail.vue";

const props = defineProps<{ selected: string | null }>();

const messages = useMessages();
const text = computed(() => messages.value.admin.design.components);

const current = computed(
  () => COMPONENTS.find((entry) => entry.name === props.selected) ?? COMPONENTS[0],
);

const sections = computed<NavSection[]>(() => {
  const categories = [...new Set(COMPONENTS.map((entry) => entry.category))];
  return categories.map((category) => ({
    label: category,
    items: COMPONENTS.filter((entry) => entry.category === category).map((entry) => ({
      href: routeHash({ view: "design", page: "components", component: entry.name }),
      label: entry.name,
      current: entry.name === current.value?.name,
    })),
  }));
});
</script>

<template>
  <AsideLayout>
    <template #aside>
      <Card :title="text.count(COMPONENTS.length)">
        <NavList :sections="sections" />
      </Card>
    </template>
    <EmptyState v-if="current === undefined">{{ text.noStory }}</EmptyState>
    <ComponentDetail v-else :key="current.name" :entry="current" />
  </AsideLayout>
</template>
