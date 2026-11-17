<script setup lang="ts">
/**
 * La racine du back-office. La vérification du rôle faite plus bas n'est qu'une politesse :
 * elle évite d'afficher une page vide à qui n'a rien à y faire. La garde réelle est côté
 * serveur, à chaque appel (`apps/server/src/admin/routes.ts` et le greffon Better Auth).
 */
import { ref } from "vue";
import { ProgressBar, UiRoot } from "@occulis/ui";
import { initLocale } from "../locale/browser.js";
import { markScreenShown } from "../load/page.js";
import AdminPage from "./AdminPage.vue";

const locale = ref(initLocale());
</script>

<template>
  <UiRoot full-page :locale="locale">
    <!-- La seule frontière d'attente de la page : rien ne paraît avant que l'écran entier
         — barre du haut comprise — ait ses données (« Chargement et premier rendu »). -->
    <Suspense @resolve="markScreenShown">
      <AdminPage v-model:locale="locale" />
      <template #fallback>
        <ProgressBar active />
      </template>
    </Suspense>
  </UiRoot>
</template>
