<script setup lang="ts">
/** La suppression du compte : un lien de confirmation part vers l'adresse du compte. */
import { computed, ref } from "vue";
import type { MeProfile } from "@occulis/protocol";
import { Button, Card, Dialog, SettingList, SettingRow, useMessages, useToast } from "@occulis/ui";
import * as api from "../api.js";

const props = defineProps<{
  profile: MeProfile;
  readOnly: boolean;
}>();

const messages = useMessages();
const text = computed(() => messages.value.profile.danger);
const notify = useToast();
const open = ref(false);

async function confirm() {
  const outcome = await api.requestDeletion();
  notify(outcome.ok ? text.value.sent(props.profile.email) : outcome.message, outcome.ok);
  return outcome.ok;
}
</script>

<template>
  <Card :title="text.title">
    <SettingList>
      <SettingRow :label="text.delete" :value="text.final" :description="text.description">
        <template #action>
          <Button size="sm" variant="danger" icon="trash" :disabled="readOnly" @click="open = true">
            {{ text.deleteButton }}
          </Button>
        </template>
      </SettingRow>
    </SettingList>
    <Dialog
      :open="open"
      :title="text.delete"
      :confirm-label="messages.profile.sendLink"
      danger
      @confirm="confirm"
      @close="open = false"
    >
      {{ text.dialog(profile.email) }}
    </Dialog>
  </Card>
</template>
