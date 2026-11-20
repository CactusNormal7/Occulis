<script setup lang="ts">
/**
 * La page de profil : la barre du haut, puis l'écran de la route courante. Elle attend le
 * profil — et, pour un compte vérifié, la liste d'amis, dont les non-lus font partie de la
 * barre du haut — avant de paraître.
 */
import { computed } from "vue";
import type { Locale } from "@occulis/i18n";
import {
  EmptyState,
  LocaleSwitch,
  ProgressBar,
  TopBar,
  useMessages,
  type TopBarTab,
} from "@occulis/ui";
import { useHashRoute } from "../load/hash-route.js";
import { useLoad, usePending } from "../load/use-load.js";
import { chooseLocale } from "../locale/browser.js";
import { ROUTE_PATHS } from "../net/auth.js";
import { unreadTotal } from "../social/model.js";
import { parseProfileRoute, profileHash, screenOf, skeletonOf, tabOf } from "./model.js";
import ProfileScreen from "./ProfileScreen.vue";
import * as R from "./resources.js";
import { provideSocial } from "./social.js";

const locale = defineModel<Locale>("locale", { required: true });

const messages = useMessages();
const text = computed(() => messages.value.profile);

const { loaded, reload } = await useLoad(() => R.profile);
const profile = computed(() => (loaded.value.state === "ready" ? loaded.value.value : undefined));
const verified = computed(() => profile.value?.emailVerified === true);

// Les non-lus de l'onglet Amis font partie de la barre du haut : la page attend la liste
// avec le reste, plutôt que de voir l'onglet changer de libellé une fois affichée.
if (verified.value) await useLoad(() => R.friendsOverview);

// Sous emprunt, le serveur refuse le canal social : ne pas l'ouvrir pour rien.
const social = provideSocial(() => verified.value && profile.value?.impersonating !== true);
const pending = usePending();
const { route, target, switching } = useHashRoute(parseProfileRoute, R.resourcesOf, screenOf);

const tabs = computed<TopBarTab[]>(() => {
  if (profile.value === undefined) return [];
  const unread = unreadTotal(social.state.value);
  return [
    {
      href: profileHash({ view: "account" }),
      label: text.value.tabs.account,
      current: target.value.view === "account",
    },
    {
      href: profileHash({ view: "matches", offset: 0 }),
      label: text.value.tabs.matches,
      current: tabOf(target.value) === "matches",
    },
    {
      href: profileHash({ view: "friends" }),
      label: unread > 0 ? messages.value.social.tabUnread(unread) : messages.value.social.tab,
      current: tabOf(target.value) === "friends",
    },
  ];
});

function changeLocale(next: Locale) {
  chooseLocale(next);
  locale.value = next;
}
</script>

<template>
  <ProgressBar :active="pending" />
  <TopBar :section="text.section" brand-href="/" :tabs="tabs">
    <template #end>
      <LocaleSwitch :model-value="locale" @update:model-value="changeLocale" />
      <span v-if="profile !== undefined">{{ profile.handle }}</span>
      <a href="/">{{ text.backToGame }}</a>
    </template>
  </TopBar>
  <main class="occ-page">
    <EmptyState v-if="loaded.state === 'failed'">
      {{ loaded.message }}
      <template #action>
        <a :href="ROUTE_PATHS.signin">{{ text.signIn }}</a>
      </template>
    </EmptyState>
    <ProfileScreen
      v-else-if="profile !== undefined"
      :profile="profile"
      :route="route"
      :skeleton="switching ? skeletonOf(target) : undefined"
      :reload="reload"
    />
  </main>
</template>
