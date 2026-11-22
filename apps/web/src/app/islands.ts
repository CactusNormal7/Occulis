import type { PlayerId, Board, TeamEntry } from "@occulis/core";
import type { TeamPreset } from "@occulis/protocol";
import DebriefScreenView from "../debrief/DebriefScreen.vue";
import EndScreenView from "../end/EndScreen.vue";
import MatchHud from "../hud/MatchHud.vue";
import type { HudModel } from "../hud/model.js";
import LeaveMatch from "../leave/LeaveMatch.vue";
import { currentLocale } from "../locale/current.js";
import type { DeploymentState } from "../net/session.js";
import Deployment from "../prepare/Deployment.vue";
import MatchFoundView from "../prepare/MatchFound.vue";
import TeamsScreenView from "../presets/TeamsScreen.vue";
import { mountIsland } from "./island.js";
import type { CameraCommand } from "../view/camera.js";
import type { MatchEnd, MatchNotice, OpponentAway } from "./match-controller.js";
import { element } from "./page.js";

/*
 * Le contrat de chaque îlot : ses propriétés et ses écouteurs (`onConfirm` reçoit l'événement
 * `confirm` du composant), la langue en moins — c'est le rendu qui l'ajoute.
 */

/** Quitter une partie vivante (`leave/LeaveMatch.vue`). */
export interface LeaveDialog {
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

/** La fin d'une partie regardée (`end/EndScreen.vue`). */
export interface EndScreen {
  readonly end: MatchEnd;
  readonly onMenu: () => void;
  readonly onBoard: () => void;
}

/** L'écran de fin d'une partie jouée (`debrief/DebriefScreen.vue`). */
export interface DebriefScreen {
  readonly matchId: string;
  readonly onPlayAgain: () => void;
  readonly onMenu: () => void;
}

/** La partie trouvée, à accepter ou refuser (`prepare/MatchFound.vue`). */
export interface MatchFound {
  readonly remainingMs: number;
  /** L'instant d'arrivée du message, sur `performance.now()`. */
  readonly receivedAt: number;
  readonly accepted: { readonly self: boolean; readonly opponent: boolean };
  readonly onAccept: () => void;
  readonly onDecline: () => void;
}

/** Le déploiement de son équipe (`prepare/Deployment.vue`). */
export interface DeploymentAnnouncement {
  readonly player: PlayerId;
  /** Le nom de la carte, qui choisit les équipes préparées ; ses cases viennent de `board`. */
  readonly scenario: string;
  readonly board: Board;
  readonly rulesetVersion: string;
  readonly deployment: DeploymentState;
  /** L'instant d'arrivée de l'annonce, sur `performance.now()`. */
  readonly receivedAt: number;
  readonly presets: readonly TeamPreset[];
  /** Le dernier refus du serveur, déjà mis en mots. */
  readonly rejection: string | undefined;
  readonly onDeploy: (team: readonly TeamEntry[]) => void;
}

/** L'ATH de la partie en cours (`hud/MatchHud.vue`). */
export interface MatchHudIsland {
  readonly model: HudModel;
  readonly away: OpponentAway | undefined;
  readonly notice: MatchNotice | undefined;
  readonly spectators: number;
  /** La vue de dessus est active : le bouton de vue s'allume, les autres s'éteignent. */
  readonly planView: boolean;
  /** La colonne de droite (fiche et journal) est dépliée. */
  readonly columnOpen: boolean;
  /** Abandonner (un joueur, par la fenêtre `leave/`) ou quitter (un spectateur). */
  readonly onLeave: () => void;
  readonly onCamera: (command: CameraCommand) => void;
  /** Replier ou déplier la colonne de droite, pour voir le plateau en grand. */
  readonly onToggleColumn: () => void;
}

/** Les équipes préparées, depuis le menu (`presets/TeamsScreen.vue`). */
export interface TeamsScreen {
  readonly onBack: () => void;
}

/**
 * Où chaque îlot lit ses propriétés. Chacune est tenue par le module qui la fait vivre ;
 * `undefined` vide l'îlot.
 */
export interface IslandSources {
  readonly hud: () => MatchHudIsland | undefined;
  readonly leave: () => LeaveDialog | undefined;
  readonly ended: () => EndScreen | undefined;
  readonly found: () => MatchFound | undefined;
  readonly deploying: () => DeploymentAnnouncement | undefined;
  readonly teams: () => TeamsScreen | undefined;
  readonly debrief: () => DebriefScreen | undefined;
}

/**
 * Les îlots Vue de la page du jeu, hors compte : l'ATH de partie, quitter la partie, fin
 * d'une partie regardée, partie trouvée, déploiement, équipes et écran de fin. Un rendu
 * les redessine tous — après un message comme après un changement de langue.
 */
export class Islands {
  private readonly renderHud = mountIsland<MatchHudIsland>(element("hud-root"), MatchHud);
  private readonly renderLeave = mountIsland<LeaveDialog>(element("leave-root"), LeaveMatch);
  private readonly renderEnd = mountIsland<EndScreen>(element("end-root"), EndScreenView);
  private readonly renderFound = mountIsland<MatchFound>(
    element("match-found-root"),
    MatchFoundView,
  );
  private readonly renderDeployment = mountIsland<DeploymentAnnouncement>(
    element("deploy-root"),
    Deployment,
    { fullPage: true },
  );
  private readonly renderTeams = mountIsland<TeamsScreen>(element("teams-root"), TeamsScreenView, {
    fullPage: true,
  });
  private readonly renderDebrief = mountIsland<DebriefScreen>(
    element("debrief-root"),
    DebriefScreenView,
    { fullPage: true },
  );

  constructor(private readonly sources: IslandSources) {}

  render(): void {
    const locale = currentLocale();
    const withLocale = <P>(props: P | undefined) =>
      props === undefined ? undefined : { ...props, locale };
    this.renderHud(withLocale(this.sources.hud()));
    this.renderLeave(withLocale(this.sources.leave()));
    this.renderEnd(withLocale(this.sources.ended()));
    this.renderFound(withLocale(this.sources.found()));
    this.renderDeployment(withLocale(this.sources.deploying()));
    this.renderTeams(withLocale(this.sources.teams()));
    this.renderDebrief(withLocale(this.sources.debrief()));
  }
}
