<script setup lang="ts">
/** Le réglage qui ouvre ou ferme ses parties aux amis qui voudraient les regarder. */
import { computed, ref } from "vue";
import type { MeProfile } from "@occulis/protocol";
import { Button, Card, SettingList, SettingRow, useMessages, useToast } from "@occulis/ui";
import * as friends from "../../social/api.js";

const props = defineProps<{
  profile: MeProfile;
  readOnly: boolean;
}>();

const emit = defineEmits<{ done: [message: string] }>();

const messages = useMessages();
const text = computed(() => messages.value.social.spectators);
const notify = useToast();
const busy = ref(false);

async function toggle() {
  busy.value = true;
  const outcome = await friends.allowSpectators(!props.profile.allowSpectators);
  busy.value = false;
  if (!outcome.ok) notify(outcome.message, false);
  else emit("done", outcome.value.allowSpectators ? text.value.nowAllowed : text.value.nowRefused);
}
</script>

<template>
  <Card :title="text.title">
    <SettingList>
      <SettingRow
        :label="text.label"
        :value="profile.allowSpectators ? text.allowed : text.refused"
        :description="text.description"
      >
        <template #action>
          <Button size="sm" :disabled="readOnly || busy" @click="toggle">
            {{ profile.allowSpectators ? text.refuse : text.allow }}
          </Button>
        </template>
      </SettingRow>
    </SettingList>
  </Card>
</template>
