<script setup lang="ts">
/** La liaison du compte à Google : la poser, ou la retirer s'il reste une autre façon d'entrer. */
import { computed, ref } from "vue";
import type { MeProfile } from "@occulis/protocol";
import { Button, SettingRow, useMessages, useToast } from "@occulis/ui";
import { linkGoogle } from "../../net/auth.js";
import * as api from "../api.js";
import { canUnlink } from "../model.js";

const props = defineProps<{
  profile: MeProfile;
  readOnly: boolean;
}>();

const emit = defineEmits<{ done: [message: string] }>();

const messages = useMessages();
const text = computed(() => messages.value.profile.google);
const notify = useToast();
const busy = ref(false);

const linked = computed(() => props.profile.providers.includes("google"));
const removable = computed(() => canUnlink(props.profile, "google"));
const description = computed(() => {
  if (!linked.value) return text.value.oneClick;
  return removable.value ? text.value.canSignIn : text.value.onlyMethod;
});

async function link() {
  busy.value = true;
  const outcome = await linkGoogle();
  // En cas de succès, la page part chez Google.
  if (outcome.ok) return;
  busy.value = false;
  notify(outcome.message, false);
}

async function unlink() {
  busy.value = true;
  const outcome = await api.unlink("google");
  busy.value = false;
  if (outcome.ok) emit("done", text.value.unlinked);
  else notify(outcome.message, false);
}
</script>

<template>
  <SettingRow
    label="Google"
    :value="linked ? text.linked : text.notLinked"
    :description="description"
  >
    <template #action>
      <Button v-if="linked" size="sm" :disabled="readOnly || busy || !removable" @click="unlink">
        {{ text.remove }}
      </Button>
      <Button v-else size="sm" icon="link" :disabled="readOnly || busy" @click="link">
        {{ text.link }}
      </Button>
    </template>
  </SettingRow>
</template>
