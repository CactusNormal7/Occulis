<script setup lang="ts">
/** La suspension d'un compte : un motif, et une durée choisie parmi des propositions ou tapée. */
import { computed, ref } from "vue";
import { ChipGroup, Dialog, Note, TextField, useMessages } from "@occulis/ui";
import * as api from "../api.js";
import { banDuration, banPresets } from "../model.js";
import type { Act, QuickUser } from "./act.js";

const props = defineProps<{
  user: QuickUser;
  act: Act;
}>();

const emit = defineEmits<{ close: [] }>();

const messages = useMessages();
const text = computed(() => messages.value.admin.actions);
const presets = banPresets();
const presetOptions = presets.map((preset) => ({ value: preset.days, label: preset.label }));

const reason = ref("");
const days = ref("");
const duration = computed(() => banDuration(days.value));

/** La proposition choisie, s'il y en a une ; aucune quand la durée est tapée à la main. */
const chosenPreset = computed(() =>
  presets.some((preset) => preset.days === days.value) ? days.value : undefined,
);

function choosePreset(value: string | undefined) {
  days.value = value ?? "";
}

function confirm() {
  const current = duration.value;
  if (!current.ok) return false;
  return props.act(
    api.ban(props.user.id, reason.value, current.seconds),
    text.value.banned(props.user.name),
  );
}
</script>

<template>
  <Dialog
    open
    :title="text.banTitle(user.name)"
    :confirm-label="text.ban"
    danger
    :ready="duration.ok"
    @confirm="confirm"
    @close="emit('close')"
  >
    <Note>{{ text.banNote }}</Note>
    <TextField v-model="reason" :label="text.reason" />
    <ChipGroup
      :options="presetOptions"
      :model-value="chosenPreset"
      @update:model-value="choosePreset"
    />
    <TextField
      v-model="days"
      :label="text.days"
      :placeholder="text.daysPlaceholder"
      :hint="duration.ok ? undefined : text.daysHint"
    />
  </Dialog>
</template>
