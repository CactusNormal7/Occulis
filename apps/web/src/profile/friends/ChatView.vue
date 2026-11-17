<script setup lang="ts">
/**
 * La conversation avec un ami. Le fil lu avec l'écran ; s'y ajoutent ce que le canal pousse,
 * ce qu'on envoie, et les messages plus anciens chargés à la demande. Lire le fil le marque
 * lu — sauf sous emprunt, où rien ne doit changer pour le joueur.
 */
import { computed, onBeforeUnmount, shallowRef, watch } from "vue";
import type { ChatMessage } from "@occulis/protocol";
import {
  BackLink,
  Button,
  Card,
  EmptyState,
  MessageComposer,
  MessageThread,
  useMessages,
  useToast,
  type ThreadMessage,
} from "@occulis/ui";
import { useLoad } from "../../load/use-load.js";
import * as friends from "../../social/api.js";
import { friendOf, readAll } from "../../social/model.js";
import { messageTime, profileHash } from "../model.js";
import * as R from "../resources.js";
import { useSocial } from "../social.js";
import { merged, withMessage } from "./thread.js";

const props = defineProps<{
  id: string;
  readOnly: boolean;
}>();

/** La longueur d'un message, bornée comme côté serveur. */
const MAX_MESSAGE_LENGTH = 500;

const messages = useMessages();
const text = computed(() => messages.value.social);
const notify = useToast();
const social = useSocial();

const { loaded } = await useLoad(() => R.chat(props.id));

const thread = shallowRef<readonly ChatMessage[]>([]);
const hasMore = shallowRef(false);

const name = computed(
  () => friendOf(social.state.value, props.id)?.handle ?? text.value.friend.someone,
);

function markRead() {
  if (props.readOnly) return;
  void friends.markRead(props.id);
  social.update((current) => readAll(current, props.id));
}

// Une relecture du fil s'y fond sans perdre ce qui est arrivé entre-temps.
watch(
  loaded,
  (current) => {
    if (current.state !== "ready") return;
    thread.value = merged(current.value.messages, thread.value);
    hasMore.value = current.value.hasMore;
    markRead();
  },
  { immediate: true },
);

const unlisten = social.listen((pushed) => {
  if (pushed.kind !== "message") return;
  const incoming = pushed.message;
  if (incoming.sender !== props.id && incoming.recipient !== props.id) return;
  thread.value = withMessage(thread.value, incoming);
  if (incoming.sender === props.id) markRead();
});
onBeforeUnmount(unlisten);

async function loadOlder() {
  const first = thread.value[0];
  if (first === undefined) return;
  const outcome = await friends.messages(props.id, first.createdAt);
  if (!outcome.ok) return;
  thread.value = merged(outcome.value.messages, thread.value);
  hasMore.value = outcome.value.hasMore;
}

async function send(body: string): Promise<boolean> {
  const outcome = await friends.sendMessage(props.id, body);
  if (!outcome.ok) {
    notify(outcome.message, false);
    return false;
  }
  thread.value = withMessage(thread.value, outcome.value);
  return true;
}

/** Le fil tel que la charte l'affiche : ses messages à droite, l'heure, et « lu » s'il l'est. */
const shown = computed<ThreadMessage[]>(() => {
  const now = Date.now();
  return thread.value.map((message) => {
    const mine = message.sender !== props.id;
    const read = mine && message.readAt !== null ? ` · ${text.value.chat.read}` : "";
    return {
      id: message.id,
      body: message.body,
      mine,
      meta: `${messageTime(message.createdAt, now)}${read}`,
    };
  });
});
</script>

<template>
  <BackLink :href="profileHash({ view: 'friend', id, offset: 0 })">{{ name }}</BackLink>
  <Card :title="text.chat.title(name)">
    <EmptyState v-if="loaded.state === 'failed'" error>{{ loaded.message }}</EmptyState>
    <template v-else>
      <MessageThread :messages="shown" :empty="text.chat.empty">
        <template v-if="hasMore" #more>
          <Button size="sm" variant="ghost" @click="loadOlder">{{ text.chat.older }}</Button>
        </template>
      </MessageThread>
      <MessageComposer
        :disabled="readOnly"
        :maxlength="MAX_MESSAGE_LENGTH"
        :placeholder="readOnly ? text.readOnly : text.chat.placeholder"
        :send-label="text.chat.send"
        @send="send"
      />
    </template>
  </Card>
</template>
