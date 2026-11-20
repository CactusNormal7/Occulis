<script setup lang="ts">
/** Recherche par préfixe de pseudo, au fil de la frappe, à partir de deux caractères. */
import { computed, ref } from "vue";
import type { PlayerSearchResult, Relation } from "@occulis/protocol";
import {
  Badge,
  Button,
  Card,
  IconButton,
  List,
  ListRow,
  Person,
  SearchField,
  useMessages,
} from "@occulis/ui";
import * as friends from "../../social/api.js";
import { useFriendAct } from "../social.js";

const props = defineProps<{ readOnly: boolean }>();

/** Le nombre de caractères à partir duquel la recherche part. */
const MIN_PREFIX = 2;

const messages = useMessages();
const text = computed(() => messages.value.social);
const act = useFriendAct();

const prefix = ref("");
const results = ref<readonly PlayerSearchResult[]>([]);
/** Le rang de la dernière recherche : une réponse plus ancienne décrirait un autre préfixe. */
let generation = 0;

const searching = computed(() => [...prefix.value].length >= MIN_PREFIX);

async function lookup(value: string) {
  const trimmed = value.trim();
  prefix.value = trimmed;
  const current = ++generation;
  if ([...trimmed].length < MIN_PREFIX) {
    results.value = [];
    return;
  }
  const outcome = await friends.search(trimmed);
  if (current === generation && outcome.ok) results.value = outcome.value;
}

/** Montre tout de suite la relation que le geste vient d'établir. */
function setRelation(id: string, relation: Relation) {
  results.value = results.value.map((player) =>
    player.id === id ? { ...player, relation } : player,
  );
}

function request(player: PlayerSearchResult) {
  act(friends.requestFriend(player.id), text.value.toasts.requested(player.handle));
  setRelation(player.id, "outgoing");
}

function accept(player: PlayerSearchResult) {
  act(friends.acceptRequest(player.id), text.value.toasts.friends(player.handle));
  setRelation(player.id, "friend");
}

/** « none » et « incoming » ont leur geste : ne restent que les relations établies. */
function relationLabel(relation: Exclude<Relation, "none" | "incoming">): string {
  return text.value.relations[relation];
}
</script>

<template>
  <Card :title="text.search.title">
    <SearchField :placeholder="text.search.placeholder" @input="lookup" @search="lookup" />
    <List v-if="searching">
      <ListRow v-if="results.length === 0">
        <small>{{ text.search.none(prefix) }}</small>
      </ListRow>
      <ListRow v-for="player in results" :key="player.id">
        <Person :name="player.handle" />
        <template #end>
          <IconButton
            v-if="player.relation === 'none'"
            icon="userPlus"
            :label="text.search.request(player.handle)"
            tip-align="end"
            :disabled-reason="props.readOnly ? text.readOnly : undefined"
            @click="request(player)"
          />
          <Button
            v-else-if="player.relation === 'incoming'"
            size="sm"
            :disabled="readOnly"
            @click="accept(player)"
          >
            {{ text.search.accept }}
          </Button>
          <Badge v-else tone="dim">{{ relationLabel(player.relation) }}</Badge>
        </template>
      </ListRow>
    </List>
  </Card>
</template>
