<script setup lang="ts">
/**
 * L'écran du compte connecté : le bandeau d'emprunt s'il y a lieu, puis l'écran de la route —
 * ou, pendant une navigation vers un écran pas encore arrivé, sa forme.
 */
import { computed } from "vue";
import type { MeProfile } from "@occulis/protocol";
import { Banner, Button, SkeletonScreen, useMessages, type SkeletonLayout } from "@occulis/ui";
import { stopImpersonating } from "../net/auth.js";
import AccountView from "./account/AccountView.vue";
import ChatView from "./friends/ChatView.vue";
import FriendMatchView from "./friends/FriendMatchView.vue";
import FriendsView from "./friends/FriendsView.vue";
import FriendView from "./friends/FriendView.vue";
import MatchesView from "./matches/MatchesView.vue";
import MatchView from "./matches/MatchView.vue";
import { screenOf, type ProfileRoute } from "./model.js";

const props = defineProps<{
  profile: MeProfile;
  route: ProfileRoute;
  /** L'écran visé n'est pas arrivé : sa forme, à la place de l'écran de `route`. */
  skeleton: SkeletonLayout | undefined;
  reload: () => void;
}>();

const messages = useMessages();
const text = computed(() => messages.value.profile.impersonation);
/** Une session d'emprunt ne modifie rien : tous les gestes sont grisés. */
const readOnly = computed(() => props.profile.impersonating);

async function stop() {
  await stopImpersonating();
  location.assign("/admin/");
}
</script>

<template>
  <!-- Une clé par écran : une autre page de l'historique garde l'écran et son focus. -->
  <div :key="screenOf(route)" class="occ-stack">
    <Banner v-if="profile.impersonating" icon="impersonate">
      {{ text.text }}
      <template #action>
        <Button variant="danger" @click="stop">{{ text.stop }}</Button>
      </template>
    </Banner>

    <!-- L'onglet a déjà changé : l'écran suivant, s'il n'est pas arrivé, montre sa forme
         plutôt que l'écran qu'on quitte (« Chargement et premier rendu »). -->
    <SkeletonScreen v-if="skeleton !== undefined" :layout="skeleton" />
    <AccountView v-else-if="route.view === 'account'" :profile="profile" :reload="reload" />
    <MatchesView
      v-else-if="route.view === 'matches'"
      :offset="route.offset"
      :read-only="readOnly"
    />
    <MatchView v-else-if="route.view === 'match'" :id="route.id" />
    <FriendsView v-else-if="route.view === 'friends'" :read-only="readOnly" />
    <FriendView
      v-else-if="route.view === 'friend'"
      :id="route.id"
      :offset="route.offset"
      :read-only="readOnly"
    />
    <FriendMatchView
      v-else-if="route.view === 'friendMatch'"
      :id="route.id"
      :match-id="route.matchId"
    />
    <ChatView v-else :id="route.id" :read-only="readOnly" />
  </div>
</template>
