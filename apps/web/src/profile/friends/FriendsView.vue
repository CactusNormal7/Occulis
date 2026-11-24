<script setup lang="ts">
/**
 * L'onglet « Amis » du profil : la recherche, la liste et sa gestion, les défis reçus, les
 * demandes et les joueurs bloqués. Défier et regarder une partie se font depuis le jeu, seul
 * à pouvoir s'asseoir à une table.
 *
 * Tout ce qui est grisé ici, le serveur le refuse aussi (`apps/server/src/social/`).
 */
import { computed } from "vue";
import { Card, CardColumn, CardGrid, EmptyState, List, ListRow, useMessages } from "@occulis/ui";
import { useSocial } from "../social.js";
import BlockedCard from "./BlockedCard.vue";
import FriendList from "./FriendList.vue";
import RequestsCard from "./RequestsCard.vue";
import SearchCard from "./SearchCard.vue";

defineProps<{ readOnly: boolean }>();

const messages = useMessages();
const text = computed(() => messages.value.social);
const { state } = useSocial();
</script>

<template>
  <EmptyState v-if="state.overview === undefined">{{ text.loading }}</EmptyState>
  <CardGrid v-else>
    <CardColumn>
      <SearchCard :read-only="readOnly" />
      <FriendList :friends="state.overview.friends" :read-only="readOnly" />
    </CardColumn>
    <CardColumn>
      <Card v-if="state.incoming.length > 0" :title="text.challenges.title">
        <List>
          <ListRow v-for="challenge in state.incoming" :key="challenge.from.id">
            <strong>{{ text.challenges.from(challenge.from.handle) }}</strong>
            <small>{{ text.challenges.hint }}</small>
            <template #end>
              <a href="/">{{ text.challenges.openGame }}</a>
            </template>
          </ListRow>
        </List>
      </Card>
      <RequestsCard :read-only="readOnly" />
      <BlockedCard :read-only="readOnly" />
    </CardColumn>
  </CardGrid>
</template>
