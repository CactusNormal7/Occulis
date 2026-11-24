<script setup lang="ts">
/**
 * L'écran de compte : connexion, inscription, mot de passe oublié, réinitialisation.
 *
 * Écrit pour les gestionnaires de mots de passe avant tout, parce que c'est par eux que
 * passe un mot de passe solide :
 * - **un formulaire par parcours, chacun à son URL** (`/sign-in`, `/sign-up`…) :
 *   un formulaire unique dont on masquait des champs ne laissait pas distinguer une
 *   connexion d'une inscription, donc pas proposer de générer un mot de passe ;
 * - des `autocomplete` exacts (`username`, `current-password`, `new-password`) sur des
 *   champs nommés et libellés, le pseudo **après** l'adresse pour qu'il ne soit pas pris
 *   pour l'identifiant ;
 * - un vrai `<form>` soumis, puis une **navigation** (`history`) au succès : c'est à elle
 *   que les gestionnaires reconnaissent une connexion réussie et proposent d'enregistrer.
 */
import { onBeforeUnmount, onMounted, ref } from "vue";
import ForgotForm from "./ForgotForm.vue";
import { provideAccountFlow } from "./flow.js";
import { pathOf, routeOf, type AccountRoute, type Notice, type RouteKind } from "./model.js";
import RegisterForm from "./RegisterForm.vue";
import ResetForm from "./ResetForm.vue";
import SignInForm from "./SignInForm.vue";

const props = defineProps<{
  /** Le parcours lu dans l'URL au chargement, avant que ses paramètres en soient retirés. */
  initialRoute: AccountRoute;
  initialNotice: Notice | undefined;
  providers: readonly string[];
}>();

/** Une session vient d'être ouverte : la page relit l'identité et passe au menu. */
const emit = defineEmits<{ signedIn: [message?: string] }>();

const route = ref<AccountRoute>(props.initialRoute);
const notice = ref<Notice | undefined>(props.initialNotice);
const email = ref("");

function navigate(kind: RouteKind, next?: Notice) {
  if (location.pathname !== pathOf(kind)) history.pushState(null, "", pathOf(kind));
  route.value = kind === "reset" ? { kind, token: undefined } : { kind };
  notice.value = next;
}

provideAccountFlow({ email, notice, navigate, google: props.providers.includes("google") });

function signedIn(message?: string) {
  // La navigation est le signal qu'attendent les gestionnaires de mots de passe pour
  // proposer l'enregistrement ; elle ramène aussi l'URL à celle du menu.
  history.pushState(null, "", "/");
  emit("signedIn", message);
}

function onPopState() {
  route.value = routeOf(location.pathname, location.search);
  notice.value = undefined;
}

onMounted(() => window.addEventListener("popstate", onPopState));
onBeforeUnmount(() => window.removeEventListener("popstate", onPopState));
</script>

<template>
  <SignInForm v-if="route.kind === 'signin'" @success="signedIn()" />
  <RegisterForm v-else-if="route.kind === 'register'" @success="signedIn" />
  <ForgotForm v-else-if="route.kind === 'forgot'" />
  <ResetForm v-else :token="route.token" />
</template>
