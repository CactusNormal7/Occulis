<script setup lang="ts">
/**
 * L'ATH de partie, disposition « Bandeaux » (docs/mockups/ath/a-bandeaux.html) : les deux
 * camps et le tour en haut, les alertes dessous, les outils sous la plaque adverse, la
 * fiche et le journal à droite, la caméra à gauche, la légende en bas.
 *
 * Un îlot piloté par `app/islands.ts` : tout ce qu'il montre arrive en propriétés, déjà
 * traduit par `hud/model.ts`. Il ne lit rien lui-même et ne joue rien — il rend seulement
 * les gestes de ses boutons.
 */
import { computed, ref, watch } from "vue";
import { useMessages } from "@occulis/ui";
import type { MatchNotice, OpponentAway } from "../app/match-controller.js";
import type { CameraCommand } from "../view/camera.js";
import CameraControls from "./CameraControls.vue";
import GlowLegend from "./GlowLegend.vue";
import MatchAlerts from "./MatchAlerts.vue";
import MatchJournal from "./MatchJournal.vue";
import MatchTools from "./MatchTools.vue";
import type { HudModel } from "./model.js";
import PieceSheet from "./PieceSheet.vue";
import PlayerBand from "./PlayerBand.vue";
import TurnPlate from "./TurnPlate.vue";
import "./hud.css";

const props = defineProps<{
  model: HudModel;
  away: OpponentAway | undefined;
  notice: MatchNotice | undefined;
  spectators: number;
  /** La vue de dessus est active : la caméra est figée. */
  planView: boolean;
  /** La colonne de droite (fiche et journal) est dépliée ; repliée, le plateau a la place. */
  columnOpen: boolean;
}>();
const emit = defineEmits<{
  leave: [];
  camera: [command: CameraCommand];
  toggleColumn: [];
  ability: [];
}>();

const messages = useMessages();
/**
 * L'annonce de la vue, sous le tour, le temps de la bascule. Chaque bascule la rejoue
 * (`:key`) ; elle s'efface seule, par son animation.
 */
const switches = ref(0);
watch(
  () => props.planView,
  () => {
    switches.value += 1;
  },
);
const viewName = computed(() =>
  props.planView ? messages.value.game.hud.camera.planOn : messages.value.game.hud.camera.isoOn,
);
</script>

<template>
  <div class="hud" :class="{ 'hud--column-closed': !columnOpen }">
    <header class="hud-duel">
      <PlayerBand :band="model.self" side="self" />
      <TurnPlate :turn="model.turn" />
      <PlayerBand :band="model.opponent" side="opponent" />
    </header>
    <MatchAlerts
      :check="model.check && !model.spectating"
      :away="away"
      :opponent-name="model.opponent.name"
      :notice="notice"
    />
    <MatchTools
      :spectating="model.spectating"
      :spectators="spectators"
      :watched-name="model.self.name"
      :column-open="columnOpen"
      @leave="emit('leave')"
      @toggle-column="emit('toggleColumn')"
    />
    <aside v-show="columnOpen" id="hud-column" class="hud-column">
      <PieceSheet :sheet="model.sheet" @ability="emit('ability')" />
      <MatchJournal :lines="model.journal" :draw-meter="model.drawMeter" />
    </aside>
    <GlowLegend v-if="model.showLegend" />
    <p v-if="switches > 0" :key="switches" class="hud-view-chip" aria-live="polite">
      {{ viewName }}
    </p>
    <CameraControls :plan-view="planView" @command="(command) => emit('camera', command)" />
  </div>
</template>
