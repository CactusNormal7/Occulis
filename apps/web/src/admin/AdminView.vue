<script setup lang="ts">
/** L'écran d'une route du back-office. */
import type { Route } from "./model.js";
import DesignView from "./views/DesignView.vue";
import MatchDetailView from "./views/MatchDetailView.vue";
import MatchListView from "./views/MatchListView.vue";
import OverviewView from "./views/OverviewView.vue";
import PlayerDetailView from "./views/PlayerDetailView.vue";
import UserDetailView from "./views/UserDetailView.vue";
import UserListView from "./views/UserListView.vue";

defineProps<{
  route: Route;
  /** Le pseudo de l'administrateur connecté. */
  self: string;
}>();
</script>

<template>
  <OverviewView v-if="route.view === 'overview'" />
  <UserListView
    v-else-if="route.view === 'users'"
    :search="route.search"
    :offset="route.offset"
    :self="self"
  />
  <UserDetailView v-else-if="route.view === 'user'" :id="route.id" :self="self" />
  <PlayerDetailView v-else-if="route.view === 'player'" :id="route.id" />
  <MatchListView
    v-else-if="route.view === 'matches'"
    :status="route.status"
    :offset="route.offset"
  />
  <MatchDetailView v-else-if="route.view === 'match'" :id="route.id" />
  <DesignView v-else :route="route" />
</template>
