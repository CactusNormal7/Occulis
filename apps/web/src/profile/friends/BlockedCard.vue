<script setup lang="ts">
/** Les joueurs bloqués, à débloquer un à un. */
import { computed } from "vue";
import { Card, IconButton, List, ListRow, Person, useMessages } from "@occulis/ui";
import * as friends from "../../social/api.js";
import { useFriendAct, useSocial } from "../social.js";

defineProps<{ readOnly: boolean }>();

const messages = useMessages();
const text = computed(() => messages.value.social);
const act = useFriendAct();
const { state } = useSocial();
const blocked = computed(() => state.value.overview?.blocked ?? []);
</script>

<template>
  <Card v-if="blocked.length > 0" :title="text.blocked.title">
    <List>
      <ListRow v-for="player in blocked" :key="player.id">
        <Person :name="player.handle" :detail="text.blocked.detail" />
        <template #end>
          <IconButton
            icon="unban"
            :label="text.blocked.unblock"
            tip-align="end"
            :disabled-reason="readOnly ? text.readOnly : undefined"
            @click="act(friends.unblock(player.id), text.toasts.unblocked(player.handle))"
          />
        </template>
      </ListRow>
    </List>
  </Card>
</template>
