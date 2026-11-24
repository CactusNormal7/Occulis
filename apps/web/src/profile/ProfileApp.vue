<script setup lang="ts">
/**
 * La page de profil, servie sous `/profile/` : le pendant du back-office, pour son propre
 * compte. En Vue sur `@occulis/ui`, sans classe ni couleur propres.
 *
 * Tout ce que la page grise, le serveur le refuse aussi : l'identité vient du cookie,
 * chaque requête est bornée au compte de la session, et une session d'emprunt n'y
 * modifie rien (`apps/server/src/me/routes.ts`, `auth/better-auth.ts`).
 */
import { ref } from "vue";
import { ProgressBar, ToastProvider, UiRoot } from "@occulis/ui";
import { initLocale } from "../locale/browser.js";
import { markScreenShown } from "../load/page.js";
import ProfilePage from "./ProfilePage.vue";

const locale = ref(initLocale());
</script>

<template>
  <UiRoot full-page :locale="locale">
    <ToastProvider>
      <!-- La seule frontière d'attente de la page : rien ne paraît avant que l'écran entier
           — barre du haut comprise — ait ses données (« Chargement et premier rendu »). -->
      <Suspense @resolve="markScreenShown">
        <ProfilePage v-model:locale="locale" />
        <template #fallback>
          <ProgressBar active />
        </template>
      </Suspense>
    </ToastProvider>
  </UiRoot>
</template>
