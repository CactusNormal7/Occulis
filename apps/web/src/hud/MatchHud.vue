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

defineProps<{
  model: HudModel;
  away: OpponentAway | undefined;
  notice: MatchNotice | undefined;
  spectators: number;
}>();
const emit = defineEmits<{ leave: []; camera: [command: CameraCommand] }>();
</script>

<template>
  <div class="hud">
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
      @leave="emit('leave')"
    />
    <aside class="hud-column">
      <PieceSheet :sheet="model.sheet" />
      <MatchJournal :lines="model.journal" :draw-meter="model.drawMeter" />
    </aside>
    <GlowLegend v-if="model.showLegend" />
    <CameraControls @command="(command) => emit('camera', command)" />
  </div>
</template>
