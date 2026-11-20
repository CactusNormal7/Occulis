<script setup lang="ts">
/**
 * La vue d'ensemble : les chiffres du jeu, les dernières parties et les derniers inscrits.
 * Comme toutes les vues du back-office, elle n'est faite que des briques de `@occulis/ui` :
 * ce qui manquerait à la charte s'ajoute à la charte.
 */
import { computed } from "vue";
import {
  Card,
  CardGrid,
  EmptyState,
  List,
  ListRow,
  PageHead,
  Person,
  StatTile,
  StatTileGrid,
  useMessages,
} from "@occulis/ui";
import Ready from "../../load/Ready.vue";
import { useLoad } from "../../load/use-load.js";
import { ACCOUNTS_ROUTE, MATCHES_ROUTE, formatDate, routeHash } from "../model.js";
import MatchTable from "../parts/MatchTable.vue";
import StateBadges from "../parts/StateBadges.vue";
import * as R from "../resources.js";

const messages = useMessages();
const text = computed(() => messages.value.admin.overview);

const { loaded } = await useLoad(() => R.overview);

const accountsHref = routeHash(ACCOUNTS_ROUTE);
const matchesHref = routeHash(MATCHES_ROUTE);
const ongoingHref = routeHash({ view: "matches", status: "ongoing", offset: 0 });

/** La part des comptes vérifiés, en pour cent arrondi. */
function verifiedShare(stats: { users: number; verifiedUsers: number }): number {
  return stats.users === 0 ? 0 : Math.round((stats.verifiedUsers / stats.users) * 100);
}
</script>

<template>
  <Ready v-slot="{ value: { stats, recent, newcomers } }" :loaded="loaded">
    <PageHead :title="text.title" />
    <StatTileGrid>
      <StatTile
        :value="stats.users"
        :label="text.accounts"
        :detail="text.lastWeek(stats.signupsLastWeek)"
        :href="accountsHref"
      />
      <StatTile
        :value="stats.verifiedUsers"
        :label="text.verified"
        :detail="text.ofAccounts(verifiedShare(stats))"
      />
      <StatTile :value="stats.bannedUsers" :label="text.banned" />
      <StatTile :value="stats.admins" :label="text.admins" />
      <StatTile
        :value="stats.matches"
        :label="text.matches"
        :detail="text.lastWeek(stats.matchesLastWeek)"
        :href="matchesHref"
      />
      <StatTile :value="stats.ongoingMatches" :label="text.ongoing" :href="ongoingHref" />
      <StatTile :value="stats.actions" :label="text.moves" />
      <StatTile :value="stats.players" :label="text.players" :detail="text.withoutAccount" />
    </StatTileGrid>

    <CardGrid>
      <Card :title="text.recentMatches">
        <template #action>
          <a :href="matchesHref">{{ text.seeAll }}</a>
        </template>
        <MatchTable v-if="recent.ok" :matches="recent.value.matches" compact />
        <EmptyState v-else error>{{ recent.message }}</EmptyState>
      </Card>

      <Card :title="text.newcomers">
        <template #action>
          <a :href="accountsHref">{{ text.seeAll }}</a>
        </template>
        <List v-if="newcomers.ok">
          <ListRow v-for="user in newcomers.value.users.slice(0, 6)" :key="user.id">
            <Person
              :name="user.name"
              :detail="formatDate(user.createdAt)"
              :href="routeHash({ view: 'user', id: user.id })"
            />
            <template #end>
              <StateBadges :user="user" />
            </template>
          </ListRow>
        </List>
        <EmptyState v-else error>{{ newcomers.message }}</EmptyState>
      </Card>
    </CardGrid>
  </Ready>
</template>
