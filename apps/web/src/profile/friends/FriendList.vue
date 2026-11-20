<script setup lang="ts">
/** La liste d'amis : présence, non-lus, messages, et le retrait — confirmé. */
import { computed, ref } from "vue";
import type { Friend } from "@occulis/protocol";
import {
  Badge,
  BadgeRow,
  Card,
  Dialog,
  EmptyState,
  IconButton,
  List,
  ListRow,
  Person,
  QuickBar,
  useMessages,
} from "@occulis/ui";
import * as friendsApi from "../../social/api.js";
import { presenceLabel } from "../../social/model.js";
import { profileHash } from "../model.js";
import { useFriendAct } from "../social.js";

defineProps<{
  friends: readonly Friend[];
  readOnly: boolean;
}>();

const messages = useMessages();
const text = computed(() => messages.value.social);
const act = useFriendAct();
/** L'ami dont le retrait attend confirmation. */
const removing = ref<Friend | undefined>(undefined);

function openChat(friend: Friend) {
  location.hash = profileHash({ view: "chat", id: friend.id });
}

function confirmRemoval() {
  const friend = removing.value;
  if (friend !== undefined)
    act(friendsApi.removeFriend(friend.id), text.value.toasts.removed(friend.handle));
  return true;
}
</script>

<template>
  <Card :title="text.list.title(friends.length)">
    <EmptyState v-if="friends.length === 0">{{ text.list.empty }}</EmptyState>
    <List v-else>
      <ListRow v-for="friend in friends" :key="friend.id">
        <Person
          :name="friend.handle"
          :href="profileHash({ view: 'friend', id: friend.id, offset: 0 })"
        >
          <template #detail>
            <BadgeRow>
              <Badge :tone="friend.online ? 'strong' : 'dim'">{{ presenceLabel(friend) }}</Badge>
              <Badge v-if="friend.unread > 0" tone="strong">{{ text.unread(friend.unread) }}</Badge>
            </BadgeRow>
          </template>
        </Person>
        <template #end>
          <QuickBar>
            <IconButton
              icon="message"
              :label="
                friend.unread > 0 ? text.list.unreadMessages(friend.unread) : text.list.messages
              "
              @click="openChat(friend)"
            />
            <IconButton
              icon="close"
              :label="text.list.remove"
              tip-align="end"
              danger
              :disabled-reason="readOnly ? text.readOnly : undefined"
              @click="removing = friend"
            />
          </QuickBar>
        </template>
      </ListRow>
    </List>
    <Dialog
      :open="removing !== undefined"
      :title="text.list.removeTitle"
      :confirm-label="text.list.removeConfirm"
      danger
      @confirm="confirmRemoval"
      @close="removing = undefined"
    >
      {{ text.list.removeText(removing?.handle ?? "") }}
    </Dialog>
  </Card>
</template>
