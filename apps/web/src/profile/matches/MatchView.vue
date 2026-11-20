<script setup lang="ts">
/** Le replay d'une de ses parties. */
import { computed } from "vue";
import { useMessages } from "@occulis/ui";
import Ready from "../../load/Ready.vue";
import { useLoad } from "../../load/use-load.js";
import { profileHash } from "../model.js";
import MatchReplayView from "../parts/MatchReplayView.vue";
import * as R from "../resources.js";

const props = defineProps<{ id: string }>();

const messages = useMessages();
const back = computed(() => ({
  href: profileHash({ view: "matches", offset: 0 }),
  label: messages.value.profile.matches.back,
}));

const { loaded } = await useLoad(() => R.match(props.id));
</script>

<template>
  <Ready v-slot="{ value: match }" :loaded="loaded">
    <MatchReplayView :match="match" :back="back" />
  </Ready>
</template>
