<script setup lang="ts">
/**
 * La vue du compte : des réglages **en lecture d'abord**, chacun avec son bouton. Rien
 * n'est un champ tant qu'on n'a pas demandé à le modifier, et un seul éditeur est ouvert
 * à la fois — ce qu'on change reste lisible, à côté de ce qu'on ne change pas.
 */
import { computed, onMounted, ref } from "vue";
import type { MeProfile } from "@occulis/protocol";
import {
  Badge,
  Card,
  CardColumn,
  CardGrid,
  Hero,
  SettingList,
  SettingRow,
  TileAvatar,
  useMessages,
  useToast,
} from "@occulis/ui";
import { formatDate } from "../../admin/model.js";
import { arrivalMessage, handleCooldownLabel, profileHash } from "../model.js";
import RecordCard from "../parts/RecordCard.vue";
import DangerZone from "./DangerZone.vue";
import EmailEditor from "./EmailEditor.vue";
import FeatsCard from "./FeatsCard.vue";
import GoogleSetting from "./GoogleSetting.vue";
import HandleEditor from "./HandleEditor.vue";
import PasswordEditor from "./PasswordEditor.vue";
import PasswordSetupEditor from "./PasswordSetupEditor.vue";
import SessionsCard from "./SessionsCard.vue";
import SpectatorsCard from "./SpectatorsCard.vue";
import VerifyBanner from "./VerifyBanner.vue";

const props = defineProps<{
  profile: MeProfile;
  reload: () => void;
}>();

/** Le réglage dont l'éditeur est ouvert : un seul à la fois. */
type Editing = "handle" | "email" | "password" | null;

const messages = useMessages();
const text = computed(() => messages.value.profile);
const notify = useToast();
const editing = ref<Editing>(null);

/** Une session d'emprunt ne modifie rien : aucun éditeur ne s'ouvre. */
const readOnly = computed(() => props.profile.impersonating);
const cooldown = computed(() => handleCooldownLabel(props.profile, Date.now()));
const showsGoogle = computed(
  () =>
    props.profile.availableProviders.includes("google") ||
    props.profile.providers.includes("google"),
);

/**
 * L'ouverture d'un éditeur, passée en `:on-edit` plutôt qu'en `@edit` : sous emprunt, elle
 * est absente, et `SettingRow` ne montre alors pas de bouton.
 */
function editor(which: Exclude<Editing, null>) {
  return readOnly.value ? undefined : () => (editing.value = which);
}

/** Un éditeur a abouti : on l'annonce, on le referme, et on relit le compte. */
function done(message: string) {
  notify(message, true);
  editing.value = null;
  props.reload();
}

function cancel() {
  editing.value = null;
}

// Le message d'une redirection (bienvenue Google, liaison) est lu une fois, puis retiré de
// l'URL pour ne pas réapparaître à chaque rechargement.
onMounted(() => {
  const arrival = arrivalMessage(location.search);
  if (arrival !== undefined) notify(arrival.text, arrival.ok);
  if (location.search.length > 0)
    history.replaceState(null, "", `${location.pathname}${location.hash}`);
  if (location.hash === "#security") document.getElementById("security")?.scrollIntoView();
});
</script>

<template>
  <Hero :title="profile.handle">
    <template #avatar>
      <TileAvatar :name="profile.handle" size="lg" />
    </template>
    <template #badges>
      <Badge v-if="profile.emailVerified">{{ text.verified }}</Badge>
      <Badge v-else tone="dim">{{ text.unverified }}</Badge>
    </template>
    <template #meta>
      <span>{{ profile.email }}</span>
      <span>{{ text.memberSince(formatDate(profile.createdAt)) }}</span>
    </template>
  </Hero>

  <VerifyBanner v-if="!profile.emailVerified" :profile="profile" :read-only="readOnly" />

  <CardGrid>
    <CardColumn>
      <Card :title="text.account.title">
        <SettingList>
          <SettingRow
            :label="text.account.handle"
            :value="profile.handle"
            :description="cooldown ?? text.account.handleDescription"
            :edit-disabled="cooldown !== undefined"
            :editing="editing === 'handle'"
            :on-edit="editor('handle')"
          >
            <HandleEditor :current="profile.handle" @done="done" @cancel="cancel" />
          </SettingRow>
          <SettingRow
            :label="text.account.email"
            :value="profile.email"
            :description="
              profile.emailVerified ? text.account.emailVerified : text.account.emailUnverified
            "
            :editing="editing === 'email'"
            :on-edit="editor('email')"
          >
            <EmailEditor :profile="profile" @done="done" @cancel="cancel" />
          </SettingRow>
        </SettingList>
      </Card>
      <RecordCard :record="profile.record" :elo="profile.elo">
        <template #action>
          <a :href="profileHash({ view: 'matches', offset: 0 })">{{ text.record.history }}</a>
        </template>
      </RecordCard>
      <FeatsCard :read-only="readOnly" />
      <SpectatorsCard :profile="profile" :read-only="readOnly" @done="done" />
    </CardColumn>

    <CardColumn>
      <Card id="security" :title="text.security.title">
        <SettingList>
          <SettingRow
            :label="text.security.password"
            :value="profile.hasPassword ? '••••••••••' : text.security.none"
            :description="profile.hasPassword ? undefined : text.security.googleOnly"
            :edit-label="profile.hasPassword ? text.security.change : text.security.set"
            :editing="editing === 'password'"
            :on-edit="editor('password')"
          >
            <PasswordEditor
              v-if="profile.hasPassword"
              :email="profile.email"
              @done="done"
              @cancel="cancel"
            />
            <PasswordSetupEditor v-else :email="profile.email" @done="done" @cancel="cancel" />
          </SettingRow>
          <GoogleSetting v-if="showsGoogle" :profile="profile" :read-only="readOnly" @done="done" />
        </SettingList>
      </Card>
      <SessionsCard :read-only="readOnly" />
      <DangerZone :profile="profile" :read-only="readOnly" />
    </CardColumn>
  </CardGrid>
</template>
