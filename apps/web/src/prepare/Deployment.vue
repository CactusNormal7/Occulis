<script setup lang="ts">
/**
 * L'écran de déploiement : l'annonce de l'adversaire, puis la composition et le placement
 * de l'équipe, avant l'échéance. L'annonce entre en scène puis se range en bandeau au
 * bout de quelques secondes ; le constructeur d'équipe est dessous dès le départ, le
 * temps courant déjà.
 *
 * Le serveur ne dit rien du placement adverse — seulement s'il est verrouillé.
 */
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { rulesetFor, type Board, type PlayerId, type TeamEntry } from "@occulis/core";
import type { TeamPreset } from "@occulis/protocol";
import {
  Badge,
  Button,
  CountdownRing,
  FormMessage,
  PageHead,
  Reveal,
  SelectField,
  useMessages,
} from "@occulis/ui";
import type { DeploymentState } from "../net/session.js";
import { fromEntries, toEntries, verdict, type TeamDraft } from "../team-builder/model.js";
import TeamBuilder from "../team-builder/TeamBuilder.vue";
import CardPlate from "./CardPlate.vue";
import { useRemaining } from "./clock.js";
import { DEPLOYMENT_TOTAL_MS } from "./constants.js";
import { initialTeam, presetTeam, secondsLeft, shouldAutoSend, usablePresets } from "./model.js";

const props = defineProps<{
  player: PlayerId;
  /** Le nom de la carte, qui choisit les équipes préparées ; ses cases viennent de `board`. */
  scenario: string;
  board: Board;
  rulesetVersion: string;
  deployment: DeploymentState;
  /** L'instant d'arrivée de l'annonce, sur `performance.now()`. */
  receivedAt: number;
  presets: readonly TeamPreset[];
  /** Le dernier refus du serveur, déjà mis en mots. */
  rejection: string | undefined;
}>();

const emit = defineEmits<{ deploy: [team: readonly TeamEntry[]] }>();

/** Combien de temps l'annonce occupe l'écran avant de se ranger en bandeau. */
const REVEAL_MS = 2600;

const messages = useMessages();
const text = computed(() => messages.value.prepare);

const ruleset = computed(() => rulesetFor(props.rulesetVersion));
const usable = computed(() => usablePresets(props.presets, props.scenario, props.rulesetVersion));
const remaining = useRemaining(
  () => props.deployment.remainingMs,
  () => props.receivedAt,
);
const locked = computed(() => props.deployment.locks.self);
const opponent = computed<PlayerId>(() => (props.player === "A" ? "B" : "A"));

function startingDraft(): TeamDraft {
  const { presets, scenario, rulesetVersion, player, deployment } = props;
  return fromEntries(
    ruleset.value,
    initialTeam(presets, scenario, rulesetVersion, player, deployment, deployment.defaultTeam),
  );
}

const draft = ref<TeamDraft>(startingDraft());
/** Le joueur a-t-il touché à l'équipe ? Tant que non, elle suit les presets qui arrivent. */
const touched = ref(false);
const sent = ref(false);
const compact = ref(false);
const valid = computed(() => verdict(ruleset.value, props.deployment.zone, draft.value).ok);

const presetOptions = computed(() => [
  { value: "", label: text.value.deploy.noPreset },
  ...usable.value.map((preset) => ({ value: preset.id, label: preset.name })),
]);

const status = computed(() => {
  const { deploy } = text.value;
  const opponentLocked = props.deployment.locks.opponent;
  if (locked.value) return opponentLocked ? deploy.opponentLocked : deploy.waitingOpponent;
  return `${deploy.lead} ${opponentLocked ? deploy.opponentLocked : deploy.opponentPending}`;
});

function edit(next: TeamDraft) {
  touched.value = true;
  draft.value = next;
}

function choosePreset(id: string | undefined) {
  const chosen = usable.value.find((preset) => preset.id === id);
  if (chosen !== undefined)
    edit(fromEntries(ruleset.value, presetTeam(chosen, props.player, props.deployment)));
}

function send() {
  sent.value = true;
  emit("deploy", toEntries(draft.value));
}

// Les presets arrivent parfois après l'annonce : tant que le joueur n'a touché à rien,
// celui par défaut remplace l'équipe de la carte. Une mise à jour des verrous, elle, ne
// réécrit pas le brouillon.
watch(
  () => props.presets,
  () => {
    if (!touched.value) draft.value = startingDraft();
  },
);

// Un refus rend la main : on peut corriger et renvoyer.
watch(
  () => props.rejection,
  (rejection) => {
    if (rejection !== undefined) sent.value = false;
  },
);

// À l'échéance, une équipe valide part d'elle-même.
watch([remaining, valid, locked, sent], () => {
  if (shouldAutoSend(remaining.value, valid.value, locked.value, sent.value)) send();
});

const compactTimer = setTimeout(() => (compact.value = true), REVEAL_MS);
onBeforeUnmount(() => clearTimeout(compactTimer));
</script>

<template>
  <div class="occ-stack">
    <Reveal :compact="compact" :versus="text.reveal.versus">
      <template #self>
        <CardPlate :card="deployment.self" :camp="player" self align="start" />
      </template>
      <template #opponent>
        <CardPlate :card="deployment.opponent" :camp="opponent" :self="false" align="end" />
      </template>
      <template #footer>
        <Badge tone="strong">{{
          deployment.rated ? text.reveal.rated : text.reveal.unrated
        }}</Badge>
      </template>
    </Reveal>

    <PageHead :title="text.deploy.title">
      <template #tools>
        <SelectField
          v-if="usable.length > 0 && !locked"
          :label="text.deploy.preset"
          model-value=""
          :options="presetOptions"
          @update:model-value="choosePreset"
        />
        <CountdownRing
          :total-ms="DEPLOYMENT_TOTAL_MS"
          :remaining-ms="remaining"
          :label="text.remaining"
        >
          {{ secondsLeft(remaining) }}
        </CountdownRing>
        <Button
          variant="primary"
          :icon="locked ? undefined : 'shield'"
          :disabled="locked || sent || !valid"
          @click="send"
        >
          {{ locked ? text.deploy.locked : text.deploy.lock }}
        </Button>
      </template>
    </PageHead>

    <FormMessage tone="info">{{ status }}</FormMessage>
    <FormMessage v-if="rejection !== undefined && !locked" tone="error">{{
      rejection
    }}</FormMessage>

    <TeamBuilder
      :model-value="draft"
      :ruleset="ruleset"
      :board="board"
      :side="player"
      :zone="deployment.zone"
      :opponent-zone="deployment.opponentZone"
      :default-team="deployment.defaultTeam"
      :locked="locked || sent"
      @update:model-value="edit"
    />
    <small v-if="!locked" class="occ-muted">{{ text.deploy.timeoutNote }}</small>
  </div>
</template>
