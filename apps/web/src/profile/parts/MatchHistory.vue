<script setup lang="ts">
/**
 * L'historique des parties d'un joueur — le sien ou celui d'un ami : l'adversaire, le camp,
 * le résultat, l'évolution de la cote, et les gestes de chaque ligne.
 */
import { computed } from "vue";
import type { MeMatchSummary, Relation } from "@occulis/protocol";
import { IconButton, QuickBar, Table, useMessages } from "@occulis/ui";
import { formatDate } from "../../admin/model.js";
import MyResult from "./MyResult.vue";

const props = defineProps<{
  matches: readonly MeMatchSummary[];
  /** Le fragment du replay d'une partie. */
  replayHref: (match: MeMatchSummary) => string;
  /**
   * Ajouter l'adversaire en ami, lié par `@add-friend`. Déclaré en prop pour savoir s'il est
   * fourni : sans lui, la colonne ne le propose pas.
   */
  onAddFriend?: ((match: MeMatchSummary) => void) | undefined;
  /**
   * Ce qu'est déjà l'adversaire : un ami ou un joueur bloqué ne se propose plus, une
   * demande envoyée se grise. Inconnue (liste pas encore lue), le geste reste offert —
   * le serveur tranche de toute façon.
   */
  relationOf?: ((match: MeMatchSummary) => Relation | undefined) | undefined;
  readOnly?: boolean | undefined;
}>();

const messages = useMessages();
const text = computed(() => messages.value.profile.matches);
const columns = computed(() => {
  const c = text.value.columns;
  return [c.start, c.opponent, c.side, c.result, c.elo, c.moves, ""];
});

function offersFriend(match: MeMatchSummary): boolean {
  if (props.onAddFriend === undefined) return false;
  const relation = props.relationOf?.(match);
  return relation !== "friend" && relation !== "blocked";
}

/** Pourquoi l'ajout est grisé, s'il l'est. */
function addFriendBlocker(match: MeMatchSummary): string | undefined {
  if (props.readOnly === true) return messages.value.social.readOnly;
  if (props.relationOf?.(match) === "outgoing")
    return messages.value.social.requestPending(match.opponent);
  return undefined;
}

function ratingLabel(match: MeMatchSummary): string {
  if (match.ratingChange !== null) return text.value.ratingChange(match.ratingChange);
  return match.rated ? "—" : text.value.unrated;
}

function openReplay(match: MeMatchSummary) {
  location.hash = props.replayHref(match);
}
</script>

<template>
  <Table :columns="columns" :centered="[2]" :row-count="matches.length" :empty="text.empty">
    <tr v-for="match in matches" :key="match.id">
      <td class="occ-muted">{{ formatDate(match.startedAt) }}</td>
      <td>{{ match.opponent }}</td>
      <td class="occ-center">
        <span :class="`occ-seat occ-seat--${match.seat}`">{{ match.seat }}</span>
      </td>
      <td><MyResult :match="match" /></td>
      <td class="occ-muted">{{ ratingLabel(match) }}</td>
      <td class="occ-muted">{{ match.actions }}</td>
      <td class="occ-actions-cell">
        <QuickBar>
          <IconButton
            v-if="offersFriend(match)"
            icon="userPlus"
            :label="messages.social.addOpponent(match.opponent)"
            tip-align="end"
            :disabled-reason="addFriendBlocker(match)"
            @click="onAddFriend?.(match)"
          />
          <IconButton
            icon="eye"
            :label="match.result === 'ongoing' ? text.ongoingReplay : text.replay"
            tip-align="end"
            :disabled="match.result === 'ongoing'"
            @click="openReplay(match)"
          />
        </QuickBar>
      </td>
    </tr>
  </Table>
</template>
