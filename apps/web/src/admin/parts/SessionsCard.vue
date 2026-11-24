<script setup lang="ts">
/** Les sessions ouvertes d'un compte, à fermer une à une ou toutes à la fois. */
import { computed } from "vue";
import { Button, Card, EmptyState, IconButton, List, ListRow, useMessages } from "@occulis/ui";
import type { Act } from "../actions/act.js";
import * as api from "../api.js";
import { formatDate, shortAgent } from "../model.js";

const props = defineProps<{
  userId: string;
  sessions: Awaited<ReturnType<typeof api.sessions>>;
  act: Act;
}>();

const messages = useMessages();
const text = computed(() => messages.value.admin.user);
const list = computed(() => (props.sessions.ok ? props.sessions.value.sessions : []));

function closeAll() {
  void props.act(api.revokeSessions(props.userId), text.value.sessionsClosed);
}

function close(token: string) {
  void props.act(api.revokeSession(token), text.value.sessionClosed);
}
</script>

<template>
  <Card :title="text.sessions(list.length)">
    <template v-if="list.length > 0" #action>
      <Button size="sm" icon="logout" @click="closeAll">{{ text.closeAll }}</Button>
    </template>

    <EmptyState v-if="!sessions.ok" error>{{ sessions.message }}</EmptyState>
    <EmptyState v-else-if="list.length === 0">{{ text.noSessions }}</EmptyState>
    <List v-else>
      <ListRow v-for="session in list" :key="session.token">
        <strong>{{ shortAgent(session.userAgent) }}</strong>
        <small>
          {{
            text.sessionLine(
              session.ipAddress ?? text.unknownIp,
              formatDate(session.createdAt),
              formatDate(session.expiresAt),
            )
          }}
        </small>
        <template #end>
          <IconButton
            icon="close"
            :label="text.closeSession"
            tip-align="end"
            @click="close(session.token)"
          />
        </template>
      </ListRow>
    </List>
  </Card>
</template>
