<script setup lang="ts">
/**
 * La fiche d'un compte : son en-tête et ses actions, sa suspension éventuelle, son profil de
 * jeu, ses dernières parties, ses champs modifiables et ses sessions ouvertes.
 */
import { computed } from "vue";
import {
  BackLink,
  Banner,
  Button,
  Card,
  CardColumn,
  CardGrid,
  EmptyState,
  Hero,
  IconButton,
  TileAvatar,
  useMessages,
  useToast,
} from "@occulis/ui";
import Ready from "../../load/Ready.vue";
import { useLoad } from "../../load/use-load.js";
import { useAct, useGo } from "../actions/act.js";
import QuickActions from "../actions/QuickActions.vue";
import * as api from "../api.js";
import { ACCOUNTS_ROUTE, describeBan, formatDate, routeHash } from "../model.js";
import AccountEditCard from "../parts/AccountEditCard.vue";
import MatchTable from "../parts/MatchTable.vue";
import ProfileCard from "../parts/ProfileCard.vue";
import SessionsCard from "../parts/SessionsCard.vue";
import StateBadges from "../parts/StateBadges.vue";
import * as R from "../resources.js";

const props = defineProps<{
  id: string;
  /** Le pseudo de l'administrateur connecté. */
  self: string;
}>();

const messages = useMessages();
const text = computed(() => messages.value.admin.user);
const notify = useToast();
const go = useGo();

const { loaded, reload } = await useLoad(() => R.user(props.id));
const act = useAct(reload);

async function copyId(id: string) {
  try {
    await navigator.clipboard.writeText(id);
    notify(text.value.copied);
  } catch {
    notify(text.value.copyRefused, false);
  }
}

function leaveDeleted(name: string) {
  go(ACCOUNTS_ROUTE, text.value.deleted(name));
}

function unban() {
  void act(api.unban(props.id), text.value.unbanned);
}
</script>

<template>
  <Ready v-slot="{ value: { user, playerId, sessions, player, history } }" :loaded="loaded">
    <BackLink :href="routeHash(ACCOUNTS_ROUTE)">{{ text.back }}</BackLink>

    <Hero :title="user.name">
      <template #avatar>
        <TileAvatar :name="user.name" size="lg" />
      </template>
      <template #badges>
        <StateBadges :user="user" />
      </template>
      <template #meta>
        <span>{{ user.email }}</span>
        <span>{{ text.signedUp(formatDate(user.createdAt)) }}</span>
        <span>
          <code>{{ user.id.slice(0, 10) }}…</code>
          <IconButton icon="copy" :label="text.copyId" @click="copyId(user.id)" />
        </span>
      </template>
      <template #actions>
        <QuickActions
          framed
          :user="user"
          :self="self"
          :reload="reload"
          @deleted="leaveDeleted(user.name)"
        />
      </template>
    </Hero>

    <Banner v-if="user.banned === true">
      {{ describeBan(user) }}
      <template #action>
        <Button variant="danger" @click="unban">{{ text.unban }}</Button>
      </template>
    </Banner>

    <CardGrid>
      <CardColumn>
        <ProfileCard v-if="player?.ok === true" :player="player.value" />
        <Card v-else :title="text.gameProfile">
          <EmptyState>{{ player?.ok === false ? player.message : text.noProfile }}</EmptyState>
        </Card>

        <Card v-if="history?.ok === true" :title="text.recentMatches">
          <template v-if="playerId !== undefined" #action>
            <a :href="routeHash({ view: 'player', id: playerId })">
              {{ text.fullHistory(history.value.total) }}
            </a>
          </template>
          <MatchTable :matches="history.value.matches" compact />
        </Card>
      </CardColumn>

      <CardColumn>
        <AccountEditCard :user="user" :player-id="playerId" :act="act" />
        <SessionsCard :user-id="user.id" :sessions="sessions" :act="act" />
      </CardColumn>
    </CardGrid>
  </Ready>
</template>
