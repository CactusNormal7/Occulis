<script setup lang="ts">
/** Les appareils connectés au compte : celui-ci, et les autres, à fermer un à un ou ensemble. */
import { computed } from "vue";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  List,
  ListRow,
  useMessages,
  useToast,
} from "@occulis/ui";
import { formatDate, shortAgent } from "../../admin/model.js";
import { useLoad } from "../../load/use-load.js";
import * as api from "../api.js";
import { sinceLabel } from "../model.js";
import * as R from "../resources.js";

defineProps<{ readOnly: boolean }>();

const messages = useMessages();
const text = computed(() => messages.value.profile.sessions);
const notify = useToast();

const { loaded, reload } = await useLoad(() => R.sessions);

const sessions = computed(() => (loaded.value.state === "ready" ? loaded.value.value : []));
const others = computed(() => sessions.value.filter((session) => !session.current).length);

async function revoke(pending: Promise<{ ok: boolean; message?: string }>, done: string) {
  const outcome = await pending;
  notify(outcome.ok ? done : (outcome.message ?? text.value.failed), outcome.ok);
  if (outcome.ok) reload();
}

function sessionLine(session: (typeof sessions.value)[number]): string {
  return text.value.line(
    session.ipAddress ?? text.value.unknownIp,
    sinceLabel(session.lastActiveAt, Date.now()),
    formatDate(session.createdAt),
  );
}
</script>

<template>
  <Card :title="text.title(sessions.length)">
    <template v-if="others > 0" #action>
      <Button
        size="sm"
        icon="logout"
        :disabled="readOnly"
        @click="revoke(api.revokeOtherSessions(), text.othersClosed)"
      >
        {{ text.closeOthers }}
      </Button>
    </template>

    <EmptyState v-if="loaded.state === 'failed'" error>{{ loaded.message }}</EmptyState>
    <List v-else>
      <ListRow v-for="session in sessions" :key="session.id">
        <strong>
          {{ shortAgent(session.userAgent) }}
          <template v-if="session.impersonated">{{ text.impersonated }}</template>
        </strong>
        <small>{{ sessionLine(session) }}</small>
        <template #end>
          <Badge v-if="session.current" tone="strong">{{ text.thisDevice }}</Badge>
          <IconButton
            v-else
            icon="close"
            :label="text.close"
            tip-align="end"
            :disabled="readOnly"
            @click="revoke(api.revokeSession(session.id), text.closed)"
          />
        </template>
      </ListRow>
    </List>
  </Card>
</template>
