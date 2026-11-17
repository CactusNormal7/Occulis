<script setup lang="ts">
/**
 * Le design system, dans le back-office (`#/design`) : la charte montrée par ses propres
 * sources — tokens, composants montés en vrai, animations rejouables, conventions — avec des
 * retouches à chaud. Réservé aux administrateurs comme le reste du back-office.
 *
 * Les retouches ne s'écrivent nulle part : le thème et la palette sont posés sur le document
 * le temps de la visite, et rendus tels qu'ils étaient en quittant la section ; la palette
 * retouchée se copie sous la forme qu'attend `tokens.ts`, seule source des couleurs.
 */
import { computed, reactive, ref } from "vue";
import { Note, PageHead, Segmented, useMessages } from "@occulis/ui";
import { THEMES, type Palette, type ThemeName } from "@occulis/ui/tokens";
import { storedTheme } from "../../theme/theme-choice.js";
import { sweepVeil } from "../../ui/veil.js";
import { routeHash, type DesignPage, type Route } from "../model.js";
import ComponentsPage from "./components/ComponentsPage.vue";
import ConventionsPage from "./conventions/ConventionsPage.vue";
import { useAppliedTheme, useSlowMotion } from "./document-effects.js";
import FoundationsPage from "./foundations/FoundationsPage.vue";
import MotionPage from "./motion/MotionPage.vue";
import { provideTweaks, type Tweaks } from "./tweaks-context.js";
import TweaksCard from "./TweaksCard.vue";
import { withEntry } from "./tweaks.js";

defineProps<{ route: Extract<Route, { view: "design" }> }>();

/** Le labo n'est servi que hors production (vite.config.ts) : le lien n'existe que là où la page existe. */
const LAB_ONLINE = import.meta.env.DEV || import.meta.env.MODE === "mockups";

const PAGES: readonly DesignPage[] = ["foundations", "components", "motion", "conventions"];

const messages = useMessages();
const text = computed(() => messages.value.admin.design);

const theme = ref<ThemeName>(storedTheme());
const palette = ref<Palette>(THEMES[theme.value]);
const speed = ref(1);

const tweaks: Tweaks = reactive({
  theme,
  palette,
  speed,
  // Changer de thème passe sous le voile tramé, comme depuis les réglages du jeu.
  setTheme: (next: ThemeName) =>
    sweepVeil(() => {
      theme.value = next;
      palette.value = THEMES[next];
    }),
  setColor: (path: string, value: number) => {
    palette.value = withEntry(palette.value, path, value);
  },
  setSpeed: (next: number) => {
    speed.value = next;
  },
  reset: () => {
    palette.value = THEMES[theme.value];
  },
});
provideTweaks(tweaks);

useAppliedTheme(theme, palette);
useSlowMotion(speed);

const pageOptions = computed(() =>
  PAGES.map((value) => ({
    value,
    label: text.value.pages[value],
    href: routeHash({ view: "design", page: value, component: null }),
  })),
);
</script>

<template>
  <PageHead :title="text.title" />
  <Note>{{ text.intro }}</Note>
  <Note v-if="LAB_ONLINE">
    {{ text.lab.text }} <a href="/lab/">{{ text.lab.open }}</a>
  </Note>
  <Segmented :label="text.title" :model-value="route.page" :options="pageOptions" />
  <TweaksCard />

  <FoundationsPage v-if="route.page === 'foundations'" />
  <ComponentsPage v-else-if="route.page === 'components'" :selected="route.component" />
  <MotionPage v-else-if="route.page === 'motion'" />
  <ConventionsPage v-else />
</template>
