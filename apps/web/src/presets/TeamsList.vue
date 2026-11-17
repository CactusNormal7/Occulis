<script setup lang="ts">
/** La liste des équipes préparées, ou l'éditeur de celle qu'on ouvre. */
import { computed, ref } from "vue";
import type { TeamPreset } from "@occulis/protocol";
import {
  Badge,
  Button,
  Card,
  ChoiceList,
  ChoiceRow,
  Dialog,
  EmptyState,
  IconButton,
  Note,
  PageHead,
  QuickBar,
  useMessages,
  useToast,
} from "@occulis/ui";
import { useLoad } from "../load/use-load.js";
import * as api from "../profile/api.js";
import { presets as presetsResource } from "../profile/resources.js";
import type { PresetEditing } from "./editing.js";
import PresetEditor from "./PresetEditor.vue";

const emit = defineEmits<{ back: [] }>();

const messages = useMessages();
const text = computed(() => messages.value.team.presets);
const notify = useToast();

const { loaded, reload } = await useLoad(() => presetsResource);

const editing = ref<PresetEditing | undefined>(undefined);
const deleting = ref<TeamPreset | undefined>(undefined);

const list = computed(() => (loaded.value.state === "ready" ? loaded.value.value : undefined));
const full = computed(
  () => list.value !== undefined && list.value.presets.length >= list.value.limit,
);
const limitText = computed(() =>
  list.value === undefined ? "" : text.value.limit(list.value.limit),
);

function create() {
  editing.value = { id: undefined, name: "", team: [] };
}

function open(preset: TeamPreset) {
  editing.value = { id: preset.id, name: preset.name, team: preset.team };
}

function duplicate(preset: TeamPreset) {
  editing.value = { id: undefined, name: text.value.copyOf(preset.name), team: preset.team };
}

async function makeDefault(preset: TeamPreset) {
  const outcome = await api.setDefaultPreset(preset.id);
  if (!outcome.ok) notify(outcome.message, false);
  reload();
}

function saved() {
  notify(text.value.saved, true);
  editing.value = undefined;
  reload();
}

async function confirmDelete() {
  if (deleting.value === undefined) return false;
  const outcome = await api.deletePreset(deleting.value.id);
  notify(outcome.ok ? text.value.deleted : outcome.message, outcome.ok);
  if (outcome.ok) reload();
  return outcome.ok;
}
</script>

<template>
  <EmptyState v-if="loaded.state === 'failed'" error>
    {{ loaded.message }}
    <template #action>
      <Button @click="emit('back')">{{ text.back }}</Button>
    </template>
  </EmptyState>

  <PresetEditor
    v-else-if="list !== undefined && editing !== undefined"
    :list="list"
    :editing="editing"
    @cancel="editing = undefined"
    @saved="saved"
  />

  <div v-else-if="list !== undefined" class="occ-stack occ-enter">
    <PageHead :title="text.title" :count="list.presets.length">
      <template #tools>
        <Button variant="ghost" @click="emit('back')">{{ text.back }}</Button>
        <Button
          variant="primary"
          icon="plus"
          :disabled="full"
          :title="full ? limitText : undefined"
          @click="create"
        >
          {{ text.create }}
        </Button>
      </template>
    </PageHead>
    <Note>{{ text.lead }} {{ limitText }}</Note>
    <Card>
      <EmptyState v-if="list.presets.length === 0">{{ text.empty }}</EmptyState>
      <ChoiceList v-else :label="text.title">
        <ChoiceRow
          v-for="preset in list.presets"
          :key="preset.id"
          :muted="!preset.valid"
          @select="open(preset)"
        >
          <strong>{{ preset.name }}</strong>
          <small>
            {{ text.map(preset.scenario) }}
            <template v-if="!preset.valid"> · {{ text.invalid }} — {{ text.invalidHint }}</template>
          </small>
          <template #end>
            <QuickBar>
              <Badge v-if="preset.isDefault" tone="strong">{{ text.default }}</Badge>
              <Button v-else size="sm" :disabled="!preset.valid" @click="makeDefault(preset)">
                {{ text.makeDefault }}
              </Button>
              <IconButton
                icon="copy"
                :label="text.duplicate"
                :disabled-reason="full ? limitText : undefined"
                @click="duplicate(preset)"
              />
              <IconButton
                icon="trash"
                :label="text.delete"
                danger
                tip-align="end"
                @click="deleting = preset"
              />
            </QuickBar>
          </template>
        </ChoiceRow>
      </ChoiceList>
    </Card>
    <Dialog
      v-if="deleting !== undefined"
      open
      danger
      :title="text.deleteTitle(deleting.name)"
      :confirm-label="text.delete"
      @confirm="confirmDelete"
      @close="deleting = undefined"
    >
      <Note>{{ text.deleteNote }}</Note>
    </Dialog>
  </div>
</template>
