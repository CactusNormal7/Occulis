<script setup lang="ts">
/**
 * Un emplacement de la composition : son rôle et sa pièce, le choix de la pièce quand le
 * rôle en admet plusieurs, et la case où elle est posée.
 */
import { computed } from "vue";
import type { PlayerId, Ruleset } from "@occulis/core";
import { Badge, ChoiceRow, IconButton, SelectField, useMessages } from "@occulis/ui";
import { remove, select, setKind, type TeamDraft } from "./model.js";

const props = defineProps<{
  draft: TeamDraft;
  index: number;
  ruleset: Ruleset;
  side: PlayerId;
  locked: boolean;
}>();

const emit = defineEmits<{ change: [draft: TeamDraft] }>();

const messages = useMessages();
const text = computed(() => messages.value.team);

const slot = computed(() => props.draft.slots[props.index]!);
const type = computed(() => props.ruleset.get(slot.value.kind));
const kindOptions = computed(() =>
  props.ruleset.kindsOf(slot.value.role).map((kind) => ({ value: kind, label: kindName(kind) })),
);

function kindName(kind: string): string {
  return text.value.kinds[kind] ?? text.value.unknownKind(kind);
}

/** Le choix de la ligne, passé en prop : verrouillée, elle n'est plus qu'affichée. */
const selectSlot = computed(() =>
  props.locked ? undefined : () => emit("change", select(props.draft, props.index)),
);

function chooseKind(kind: string | undefined) {
  if (kind !== undefined) emit("change", setKind(props.draft, props.ruleset, props.index, kind));
}
</script>

<template>
  <ChoiceRow
    :camp="side"
    :selected="!locked && draft.selected === index"
    :muted="slot.coord === undefined"
    :on-select="selectSlot"
  >
    <strong>{{ text.roles[slot.role] }} · {{ kindName(slot.kind) }}</strong>
    <small>
      {{ text.stats(type.movement.steps, type.vision.range) }}
      <template v-if="type.movement.canClimb"> · {{ text.climbs }}</template>
    </small>
    <template #end>
      <SelectField
        v-if="kindOptions.length > 1 && !locked"
        :label="text.slot.choose"
        :model-value="slot.kind"
        :options="kindOptions"
        @update:model-value="chooseKind"
      />
      <Badge v-if="slot.coord === undefined" tone="dim">{{ text.slot.empty }}</Badge>
      <Badge v-else :tone="side">{{ text.slot.placed(slot.coord.x, slot.coord.y) }}</Badge>
      <IconButton
        v-if="slot.coord !== undefined && !locked"
        icon="close"
        :label="text.actions.reset"
        tip-align="end"
        @click="emit('change', remove(draft, index))"
      />
    </template>
  </ChoiceRow>
</template>
