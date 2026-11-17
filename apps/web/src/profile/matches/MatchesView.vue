<script setup lang="ts">
/** L'historique de ses parties, page par page, d'où l'on peut ajouter un adversaire en ami. */
import { computed } from "vue";
import type { MeMatchSummary } from "@occulis/protocol";
import { Card, Pager, useMessages, useToast } from "@occulis/ui";
import Ready from "../../load/Ready.vue";
import { useLoad } from "../../load/use-load.js";
import * as friends from "../../social/api.js";
import { relationTo } from "../../social/model.js";
import * as api from "../api.js";
import { profileHash } from "../model.js";
import MatchHistory from "../parts/MatchHistory.vue";
import * as R from "../resources.js";
import { useSocial } from "../social.js";

const props = defineProps<{
  offset: number;
  readOnly: boolean;
}>();

const messages = useMessages();
const text = computed(() => messages.value.profile.matches);
const notify = useToast();
const social = useSocial();

const { loaded } = await useLoad(() => R.matches(props.offset));

function replayHref(match: MeMatchSummary) {
  return profileHash({ view: "match", id: match.id });
}

function relationOf(match: MeMatchSummary) {
  return relationTo(social.state.value, match.opponentId);
}

async function addFriend(match: MeMatchSummary) {
  const outcome = await friends.requestFriend(match.opponentId);
  const toasts = messages.value.social.toasts;
  if (!outcome.ok) notify(outcome.message, false);
  else if (outcome.value.relation === "friend") notify(toasts.friends(match.opponent));
  else notify(toasts.requested(match.opponent));
  social.reload();
}

function pageHref(offset: number) {
  return profileHash({ view: "matches", offset });
}
</script>

<template>
  <Ready v-slot="{ value: page }" :loaded="loaded">
    <Card :title="text.title(page.total)">
      <MatchHistory
        :matches="page.matches"
        :replay-href="replayHref"
        :read-only="readOnly"
        :relation-of="relationOf"
        @add-friend="addFriend"
      />
      <Pager
        :offset="offset"
        :shown="page.matches.length"
        :total="page.total"
        :page-size="api.PAGE_SIZE"
        :href-for="pageHref"
      />
    </Card>
  </Ready>
</template>
