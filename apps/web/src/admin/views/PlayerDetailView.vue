<script setup lang="ts">
/** La fiche d'un profil de jeu : son bilan, et l'historique de ses parties. */
import { computed } from "vue";
import { BackLink, Badge, Card, EmptyState, Hero, TileAvatar, useMessages } from "@occulis/ui";
import Ready from "../../load/Ready.vue";
import { useLoad } from "../../load/use-load.js";
import { ACCOUNTS_ROUTE, formatDate, pageLabel, routeHash } from "../model.js";
import MatchTable from "../parts/MatchTable.vue";
import ProfileCard from "../parts/ProfileCard.vue";
import * as R from "../resources.js";

const props = defineProps<{ id: string }>();

const messages = useMessages();
const text = computed(() => messages.value.admin.player);

const { loaded } = await useLoad(() => R.player(props.id));

/** Le retour : la fiche du compte du joueur, ou la liste des comptes s'il n'en a pas. */
function backHref(userId: string | null): string {
  return routeHash(userId === null ? ACCOUNTS_ROUTE : { view: "user", id: userId });
}
</script>

<template>
  <Ready v-slot="{ value: { player, history } }" :loaded="loaded">
    <BackLink :href="backHref(player.userId)">
      {{ player.userId === null ? messages.admin.user.back : text.accountRecord }}
    </BackLink>

    <Hero :title="player.handle">
      <template #avatar>
        <TileAvatar :name="player.handle" size="lg" />
      </template>
      <template v-if="player.userId === null" #badges>
        <Badge tone="dim">{{ messages.admin.badges.noAccount }}</Badge>
      </template>
      <template #meta>
        <span>{{ text.created(formatDate(player.createdAt)) }}</span>
      </template>
    </Hero>

    <ProfileCard :player="player" />

    <Card :title="text.history">
      <template v-if="history.ok" #action>
        <span class="occ-muted">
          {{ pageLabel(0, history.value.matches.length, history.value.total) }}
        </span>
      </template>
      <MatchTable v-if="history.ok" :matches="history.value.matches" />
      <EmptyState v-else error>{{ history.message }}</EmptyState>
    </Card>
  </Ready>
</template>
