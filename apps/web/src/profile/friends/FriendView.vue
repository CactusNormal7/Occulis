<script setup lang="ts">
/** La fiche d'un ami : sa présence, son bilan, et l'historique de ses parties, page par page. */
import { computed, ref } from "vue";
import type { MeMatchSummary } from "@occulis/protocol";
import {
  BackLink,
  Badge,
  BadgeRow,
  Card,
  Dialog,
  EmptyState,
  Hero,
  IconButton,
  Note,
  Pager,
  QuickBar,
  TileAvatar,
  useMessages,
} from "@occulis/ui";
import { formatDate } from "../../admin/model.js";
import { useLoad } from "../../load/use-load.js";
import * as friends from "../../social/api.js";
import { friendOf, presenceLabel } from "../../social/model.js";
import { profileHash } from "../model.js";
import MatchHistory from "../parts/MatchHistory.vue";
import RecordCard from "../parts/RecordCard.vue";
import * as R from "../resources.js";
import { useFriendAct, useSocial } from "../social.js";

const props = defineProps<{
  id: string;
  offset: number;
  readOnly: boolean;
}>();

const messages = useMessages();
const text = computed(() => messages.value.social);
const act = useFriendAct();
const { state } = useSocial();
const blocking = ref(false);
const friendsHref = profileHash({ view: "friends" });

// Les deux lectures sont parties ensemble au préchargement de la route (`resources.ts`).
const [{ loaded }, { loaded: page }] = await Promise.all([
  useLoad(() => R.friend(props.id)),
  useLoad(() => R.friendMatches(props.id, props.offset)),
]);

// La présence de la liste, tenue à jour par le canal social, prime sur celle lue au chargement.
const live = computed(() => friendOf(state.value, props.id));
const online = computed(() => {
  if (live.value !== undefined) return live.value.online;
  return loaded.value.state === "ready" && loaded.value.value.online;
});
const presence = computed(() => {
  if (live.value !== undefined) return presenceLabel(live.value);
  return online.value ? text.value.presence.online : text.value.presence.offline;
});
const liveMatches = computed(() => live.value?.matches.length ?? 0);
/** Pourquoi les gestes sont grisés : la session d'emprunt ne modifie rien. */
const blocker = computed(() => (props.readOnly ? text.value.readOnly : undefined));

function openChat() {
  location.hash = profileHash({ view: "chat", id: props.id });
}

function remove(handle: string) {
  act(friends.removeFriend(props.id), text.value.toasts.removed(handle));
  location.hash = friendsHref;
}

function confirmBlock(handle: string) {
  act(friends.block(props.id), text.value.toasts.blocked(handle));
  location.hash = friendsHref;
  return true;
}

function replayHref(match: MeMatchSummary) {
  return profileHash({ view: "friendMatch", id: props.id, matchId: match.id });
}

function pageHref(offset: number) {
  return profileHash({ view: "friend", id: props.id, offset });
}
</script>

<template>
  <BackLink :href="friendsHref">{{ text.friend.back }}</BackLink>
  <EmptyState v-if="loaded.state === 'failed'" error>{{ loaded.message }}</EmptyState>

  <template v-else>
    <Hero :title="loaded.value.handle">
      <template #avatar>
        <TileAvatar :name="loaded.value.handle" size="lg" />
      </template>
      <template #badges>
        <BadgeRow>
          <Badge :tone="online ? 'strong' : 'dim'">{{ presence }}</Badge>
          <Badge v-if="!loaded.value.allowSpectators" tone="dim">{{
            text.friend.noSpectators
          }}</Badge>
        </BadgeRow>
      </template>
      <template #meta>
        <span>{{ text.friend.since(formatDate(loaded.value.since)) }}</span>
      </template>
      <template #actions>
        <QuickBar framed>
          <IconButton icon="message" :label="text.list.messages" @click="openChat" />
          <IconButton
            icon="close"
            :label="text.list.remove"
            :disabled-reason="blocker"
            @click="remove(loaded.value.handle)"
          />
          <IconButton
            icon="ban"
            :label="text.requests.block"
            tip-align="end"
            danger
            :disabled-reason="blocker"
            @click="blocking = true"
          />
        </QuickBar>
      </template>
    </Hero>

    <Note v-if="liveMatches > 0">
      {{ text.friend.live(loaded.value.handle, liveMatches) }}
      <a v-if="loaded.value.allowSpectators" href="/">{{ text.friend.watchFromGame }}</a>
      <template v-else>{{ text.friend.refusesSpectators }}</template>
    </Note>

    <RecordCard :record="loaded.value.record" :elo="loaded.value.elo" />

    <Card :title="text.friend.matchesTitle(loaded.value.handle)">
      <EmptyState v-if="page.state === 'failed'" error>{{ page.message }}</EmptyState>
      <template v-else>
        <MatchHistory :matches="page.value.matches" :replay-href="replayHref" />
        <Pager
          :offset="offset"
          :shown="page.value.matches.length"
          :total="page.value.total"
          :page-size="friends.FRIEND_PAGE_SIZE"
          :href-for="pageHref"
        />
      </template>
    </Card>

    <Dialog
      :open="blocking"
      :title="text.friend.blockTitle(loaded.value.handle)"
      :confirm-label="text.friend.blockConfirm"
      danger
      @confirm="confirmBlock(loaded.value.handle)"
      @close="blocking = false"
    >
      {{ text.friend.blockText }}
    </Dialog>
  </template>
</template>
