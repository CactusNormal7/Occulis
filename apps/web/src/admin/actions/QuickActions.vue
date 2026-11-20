<script setup lang="ts">
/**
 * Les actions rapides d'un compte et leurs fenêtres de confirmation, les mêmes dans la
 * liste et sur la fiche : un geste se retrouve au même endroit d'une vue à l'autre.
 * `quickActions()` (pur, testé) dit lesquelles sont fermées et pourquoi.
 */
import { computed, ref } from "vue";
import { Dialog, IconButton, Note, QuickBar, useMessages, type IconName } from "@occulis/ui";
import * as api from "../api.js";
import { isAdminRole, quickActions, routeHash, type QuickAction } from "../model.js";
import { useAct, type QuickUser } from "./act.js";
import BanDialog from "./BanDialog.vue";
import DeleteDialog from "./DeleteDialog.vue";
import ImpersonateDialog from "./ImpersonateDialog.vue";

const props = defineProps<{
  user: QuickUser;
  /** Le pseudo de l'administrateur connecté : ce qu'il ne peut pas se faire est grisé. */
  self: string;
  reload: () => void;
  /** La rangée est encadrée, posée seule dans l'en-tête d'une fiche. */
  framed?: boolean | undefined;
}>();

/** `deleted` part après une suppression réussie. */
const emit = defineEmits<{ deleted: [] }>();

const ICONS: Record<QuickAction["kind"], IconName> = {
  view: "eye",
  verify: "mail",
  role: "shield",
  ban: "ban",
  impersonate: "impersonate",
  revoke: "logout",
  delete: "trash",
};

type OpenDialog = "ban" | "delete" | "impersonate" | "promote" | null;

const messages = useMessages();
const text = computed(() => messages.value.admin.actions);
const act = useAct(() => props.reload());
const open = ref<OpenDialog>(null);
const banned = computed(() => props.user.banned === true);

const shownActions = computed(() =>
  quickActions(props.user, props.self).filter((action) => action.kind !== "view"),
);

function iconOf(action: QuickAction): IconName {
  return action.kind === "ban" && banned.value ? "unban" : ICONS[action.kind];
}

function run(kind: QuickAction["kind"]) {
  const { user } = props;
  switch (kind) {
    case "view":
      location.hash = routeHash({ view: "user", id: user.id });
      return;
    case "verify":
      void act(
        api.update(user.id, { emailVerified: !user.emailVerified }),
        text.value.verificationChanged,
      );
      return;
    case "role":
      if (isAdminRole(user.role))
        void act(api.setRole(user.id, "user"), text.value.demoted(user.name));
      else open.value = "promote";
      return;
    case "ban":
      if (banned.value) void act(api.unban(user.id), text.value.unbanned(user.name));
      else open.value = "ban";
      return;
    case "impersonate":
      open.value = "impersonate";
      return;
    case "revoke":
      void act(api.revokeSessions(user.id), text.value.revoked(user.name));
      return;
    case "delete":
      open.value = "delete";
      return;
  }
}

function promote() {
  return act(api.setRole(props.user.id, "admin"), text.value.promoted(props.user.name));
}

function close() {
  open.value = null;
}
</script>

<template>
  <QuickBar :framed="framed">
    <IconButton
      v-for="action in shownActions"
      :key="action.kind"
      :icon="iconOf(action)"
      :label="action.label"
      :danger="action.danger === true"
      :disabled-reason="action.disabled"
      @click="run(action.kind)"
    />
  </QuickBar>

  <BanDialog v-if="open === 'ban'" :user="user" :act="act" @close="close" />
  <DeleteDialog v-if="open === 'delete'" :user="user" @deleted="emit('deleted')" @close="close" />
  <ImpersonateDialog v-if="open === 'impersonate'" :user="user" @close="close" />
  <Dialog
    v-if="open === 'promote'"
    open
    :title="text.promoteTitle(user.name)"
    :confirm-label="text.promote"
    @confirm="promote"
    @close="close"
  >
    <Note>{{ text.promoteNote }}</Note>
  </Dialog>
</template>
