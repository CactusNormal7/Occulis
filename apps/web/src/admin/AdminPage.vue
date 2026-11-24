<script setup lang="ts">
/**
 * La page du back-office : la barre du haut, puis l'écran de la route courante. Elle attend
 * l'identité du compte avant de paraître — les onglets en dépendent.
 */
import { computed } from "vue";
import type { Locale } from "@occulis/i18n";
import {
  LocaleSwitch,
  ProgressBar,
  SkeletonScreen,
  ToastProvider,
  TopBar,
  useMessages,
  type TopBarTab,
} from "@occulis/ui";
import { chooseLocale } from "../locale/browser.js";
import type { Identity } from "../net/auth.js";
import { useHashRoute } from "../load/hash-route.js";
import { useLoad, usePending } from "../load/use-load.js";
import AdminGate from "./AdminGate.vue";
import { parseRoute, screenOf, sectionOf, skeletonOf } from "./model.js";
import { identity as identityResource, resourcesOf } from "./resources.js";

const locale = defineModel<Locale>("locale", { required: true });

const messages = useMessages();
const text = computed(() => messages.value.admin);

const { loaded } = await useLoad(() => identityResource);
const pending = usePending();
const { route, target, switching } = useHashRoute(parseRoute, resourcesOf, screenOf);

const identity = computed<Identity>(() =>
  loaded.value.state === "ready" ? loaded.value.value : { signedIn: false },
);
const isAdmin = computed(() => {
  const who = identity.value;
  return who.signedIn && who.impersonating !== true && who.admin === true;
});

const tabs = computed<TopBarTab[]>(() => {
  if (!isAdmin.value) return [];
  const section = sectionOf(target.value);
  const labels = text.value.tabs;
  return [
    { href: "#/", label: labels.overview, current: section === "overview" },
    { href: "#/users", label: labels.accounts, current: section === "users" },
    { href: "#/matches", label: labels.matches, current: section === "matches" },
    { href: "#/design", label: labels.design, current: section === "design" },
  ];
});

function changeLocale(next: Locale) {
  chooseLocale(next);
  locale.value = next;
}
</script>

<template>
  <ToastProvider>
    <ProgressBar :active="pending" />
    <TopBar :section="text.section" brand-href="#/" :tabs="tabs">
      <template #end>
        <LocaleSwitch :model-value="locale" @update:model-value="changeLocale" />
        <span v-if="identity.handle !== undefined">{{ identity.handle }}</span>
        <a href="/">{{ text.backToGame }}</a>
      </template>
    </TopBar>
    <main class="occ-page">
      <!-- L'onglet a déjà changé : l'écran suivant, s'il n'est pas arrivé, montre sa
           forme plutôt que l'écran qu'on quitte (« Chargement et premier rendu »). -->
      <SkeletonScreen v-if="switching && isAdmin" :layout="skeletonOf(target)" />
      <AdminGate v-else :identity="identity" :route="route" />
    </main>
  </ToastProvider>
</template>
