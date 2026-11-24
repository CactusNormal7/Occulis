<script setup lang="ts">
/**
 * Le constructeur d'équipe : les emplacements de la composition à gauche, le plateau et
 * la zone à droite. Il sert au déploiement (`prepare/`) comme à la préparation hors
 * partie (`presets/`) — l'état vit chez l'appelant (`v-model`), ce composant ne fait que le
 * montrer et le modifier par `team-builder/model.ts`.
 */
import { computed } from "vue";
import type { Board, Coord, PlayerId, Ruleset, TeamEntry } from "@occulis/core";
import {
  Button,
  Card,
  CardColumn,
  CardGrid,
  ChoiceList,
  FormMessage,
  QuickBar,
  Toolbar,
  ToolbarText,
  useMessages,
} from "@occulis/ui";
import { describeTeamError } from "../ui/messages.js";
import {
  autoFill,
  clear,
  clickTile,
  fromEntries,
  placedCount,
  verdict,
  type TeamDraft,
} from "./model.js";
import PlacementBoard from "./PlacementBoard.vue";
import SlotRow from "./SlotRow.vue";

const props = defineProps<{
  ruleset: Ruleset;
  board: Board;
  side: PlayerId;
  zone: readonly Coord[];
  opponentZone: readonly Coord[];
  /** L'équipe que propose la carte, pour repartir d'elle. */
  defaultTeam?: readonly TeamEntry[] | undefined;
  /** Verrouillée : on regarde, on ne touche plus. */
  locked?: boolean | undefined;
}>();

const draft = defineModel<TeamDraft>({ required: true });

const messages = useMessages();
const text = computed(() => messages.value.team);
const check = computed(() => verdict(props.ruleset, props.zone, draft.value));
const complete = computed(() => placedCount(draft.value) === draft.value.slots.length);

/** Toute modification passe par ici : verrouillée, l'équipe ne bouge plus. */
function change(next: TeamDraft) {
  if (props.locked !== true) draft.value = next;
}

function kindName(kind: string): string {
  return text.value.kinds[kind] ?? text.value.unknownKind(kind);
}

function initialOf(kind: string): string {
  return kindName(kind).slice(0, 1).toUpperCase();
}
</script>

<template>
  <CardGrid>
    <CardColumn>
      <Card :title="text.progress(placedCount(draft), draft.slots.length)">
        <ChoiceList :label="text.board.label">
          <SlotRow
            v-for="(slot, index) in draft.slots"
            :key="index"
            :draft="draft"
            :index="index"
            :ruleset="ruleset"
            :side="side"
            :locked="locked === true"
            @change="change"
          />
        </ChoiceList>
      </Card>
      <FormMessage v-if="!check.ok && complete" tone="error">
        {{ describeTeamError(check.error) }}
      </FormMessage>
    </CardColumn>
    <CardColumn>
      <Card flush>
        <PlacementBoard
          :board="board"
          :side="side"
          :zone="zone"
          :opponent-zone="opponentZone"
          :draft="draft"
          :initial-of="initialOf"
          @pick="(coord: Coord) => change(clickTile(draft, coord, zone))"
        />
        <Toolbar v-if="locked !== true">
          <ToolbarText>{{ text.board.hint }}</ToolbarText>
          <QuickBar>
            <Button size="sm" @click="change(autoFill(draft, zone))">{{
              text.actions.autoFill
            }}</Button>
            <Button
              v-if="defaultTeam !== undefined"
              size="sm"
              @click="change(fromEntries(ruleset, defaultTeam))"
            >
              {{ text.actions.defaults }}
            </Button>
            <Button size="sm" variant="ghost" @click="change(clear(draft))">
              {{ text.actions.reset }}
            </Button>
          </QuickBar>
        </Toolbar>
      </Card>
    </CardColumn>
  </CardGrid>
</template>
