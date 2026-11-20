<script setup lang="ts">
/** Les demandes d'amis : celles reçues, à accepter, refuser ou bloquer, et celles envoyées. */
import { computed } from "vue";
import { Card, IconButton, List, ListRow, Person, QuickBar, useMessages } from "@occulis/ui";
import { formatDate } from "../../admin/model.js";
import * as friends from "../../social/api.js";
import { useFriendAct, useSocial } from "../social.js";

const props = defineProps<{ readOnly: boolean }>();

const messages = useMessages();
const text = computed(() => messages.value.social);
const act = useFriendAct();
const { state } = useSocial();

const incoming = computed(() => state.value.overview?.incoming ?? []);
const outgoing = computed(() => state.value.overview?.outgoing ?? []);
/** Pourquoi les gestes sont grisés : la session d'emprunt ne modifie rien. */
const blocker = computed(() => (props.readOnly ? text.value.readOnly : undefined));
</script>

<template>
  <Card v-if="incoming.length > 0 || outgoing.length > 0" :title="text.requests.title">
    <List>
      <ListRow v-for="request in incoming" :key="`in-${request.id}`">
        <Person
          :name="request.handle"
          :detail="text.requests.incoming(formatDate(request.createdAt))"
        />
        <template #end>
          <QuickBar>
            <IconButton
              icon="check"
              :label="text.requests.accept"
              :disabled-reason="blocker"
              @click="act(friends.acceptRequest(request.id), text.toasts.friends(request.handle))"
            />
            <IconButton
              icon="close"
              :label="text.requests.decline"
              :disabled-reason="blocker"
              @click="act(friends.declineRequest(request.id), text.toasts.declined)"
            />
            <IconButton
              icon="ban"
              :label="text.requests.block"
              tip-align="end"
              danger
              :disabled-reason="blocker"
              @click="act(friends.block(request.id), text.toasts.blocked(request.handle))"
            />
          </QuickBar>
        </template>
      </ListRow>
      <ListRow v-for="request in outgoing" :key="`out-${request.id}`">
        <Person
          :name="request.handle"
          :detail="text.requests.outgoing(formatDate(request.createdAt))"
        />
        <template #end>
          <IconButton
            icon="close"
            :label="text.requests.withdraw"
            tip-align="end"
            :disabled-reason="blocker"
            @click="act(friends.cancelRequest(request.id), text.toasts.withdrawn)"
          />
        </template>
      </ListRow>
    </List>
  </Card>
</template>
