<script setup lang="ts">
/** Le replay d'une partie d'un ami, **de son point de vue**. */
import { computed } from "vue";
import { useMessages } from "@occulis/ui";
import Ready from "../../load/Ready.vue";
import { useLoad } from "../../load/use-load.js";
import { friendOf } from "../../social/model.js";
import { profileHash } from "../model.js";
import MatchReplayView from "../parts/MatchReplayView.vue";
import * as R from "../resources.js";
import { useSocial } from "../social.js";

const props = defineProps<{
  id: string;
  matchId: string;
}>();

const messages = useMessages();
const { state } = useSocial();

const { loaded } = await useLoad(() => R.friendMatch(props.id, props.matchId));

const name = computed(
  () => friendOf(state.value, props.id)?.handle ?? messages.value.social.friend.someone,
);
const back = computed(() => ({
  href: profileHash({ view: "friend", id: props.id, offset: 0 }),
  label: name.value,
}));
</script>

<template>
  <Ready v-slot="{ value: match }" :loaded="loaded">
    <MatchReplayView :match="match" :back="back" :friend="name" />
  </Ready>
</template>
