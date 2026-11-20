<script setup lang="ts">
/** L'éditeur d'une équipe préparée : son nom, et sa composition dans la zone du camp A. */
import { computed, ref } from "vue";
import { rulesetFor, scenarioFor } from "@occulis/core";
import type { TeamPresetList } from "@occulis/protocol";
import { Button, EmptyState, FormMessage, PageHead, TextField, useMessages } from "@occulis/ui";
import { boardForScenario } from "../game/scenario.js";
import * as api from "../profile/api.js";
import {
  emptyDraft,
  fromEntries,
  toEntries,
  verdict,
  type TeamDraft,
} from "../team-builder/model.js";
import TeamBuilder from "../team-builder/TeamBuilder.vue";
import type { PresetEditing } from "./editing.js";

const props = defineProps<{
  list: TeamPresetList;
  editing: PresetEditing;
}>();

const emit = defineEmits<{ cancel: []; saved: [] }>();

/** La longueur d'un nom d'équipe, bornée comme côté serveur. */
const MAX_NAME_LENGTH = 32;

const messages = useMessages();
const text = computed(() => messages.value.team.presets);

// La carte et le ruleset ne changent pas tant que l'éditeur est ouvert.
const ruleset = rulesetFor(props.list.rulesetVersion);
const board = boardForScenario(props.list.scenario);
const deployment = scenarioFor(props.list.scenario).deployment;

const name = ref(props.editing.name);
const draft = ref<TeamDraft>(
  props.editing.team.length > 0 ? fromEntries(ruleset, props.editing.team) : emptyDraft(ruleset),
);
const busy = ref(false);
const error = ref<string | undefined>(undefined);

async function save() {
  if (deployment === undefined) return;
  if (!verdict(ruleset, deployment.zones.A, draft.value).ok) {
    error.value = text.value.incomplete;
    return;
  }
  busy.value = true;
  error.value = undefined;
  const team = toEntries(draft.value);
  const { id } = props.editing;
  const outcome =
    id === undefined
      ? await api.createPreset(name.value, team)
      : await api.updatePreset(id, { name: name.value, team });
  busy.value = false;
  if (outcome.ok) emit("saved");
  else error.value = outcome.message;
}
</script>

<template>
  <EmptyState v-if="deployment === undefined" error>{{ text.errors["PRESET_TEAM"] }}</EmptyState>
  <div v-else class="occ-stack occ-enter">
    <PageHead :title="editing.id === undefined ? text.create : text.edit">
      <template #tools>
        <Button variant="ghost" @click="emit('cancel')">{{ text.cancel }}</Button>
        <Button variant="primary" :disabled="busy" @click="save">
          {{ busy ? text.saving : text.save }}
        </Button>
      </template>
    </PageHead>
    <TextField
      v-model="name"
      :label="text.name"
      :placeholder="text.namePlaceholder"
      :maxlength="MAX_NAME_LENGTH"
    />
    <FormMessage v-if="error !== undefined" tone="error">{{ error }}</FormMessage>
    <TeamBuilder
      v-model="draft"
      :ruleset="ruleset"
      :board="board"
      side="A"
      :zone="deployment.zones.A"
      :opponent-zone="deployment.zones.B"
      :default-team="deployment.defaultTeams.A"
    />
  </div>
</template>
