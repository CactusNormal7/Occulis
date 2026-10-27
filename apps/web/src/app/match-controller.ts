import {
  type Action,
  type ActionError,
  type Board,
  type Coord,
  type Outcome,
  type PlayerId,
  type Result,
  rulesetFor,
} from "@occulis/core";
import type { TeamPreset } from "@occulis/protocol";
import type { Movement } from "../game/movement-diff.js";
import { OnlineMatch } from "../game/online-match.js";
import { type Selection, resolveClick } from "../game/selection.js";
import { messages } from "../locale/current.js";
import type { MatchChannel, MatchHandlers } from "../net/match-channel.js";
import type { DeploymentProps } from "../prepare/Deployment.js";
import type { FlowEvent, Stage } from "../ui/flow.js";
import { describeRejection } from "../ui/messages.js";
import { type MoveAnimation, advance as step, startMove } from "../view/animation.js";

/**
 * La partie en cours côté client : le canal, la partie arbitrée par le serveur, et tout
 * ce qui n'a de sens que pendant elle — coup en attente, sélection, animation, annonce
 * de déploiement, ami regardé.
 *
 * Il n'existe qu'**un canal de partie à la fois** : `sit()` et `watch()` referment le
 * précédent avant d'en ouvrir un autre, et `close()` remet tout à zéro. Les effets sur
 * le reste de la page (écrans, console, plateau) sont fournis par la racine de
 * composition (`MatchEffects`), si bien que ce module ne touche ni le DOM ni le réseau et
 * s'éprouve sans eux.
 */

/** Au-delà, une partie qui n'a envoyé aucune vue au spectateur lui est refusée. */
const WATCH_TIMEOUT_MS = 6000;

/** Ce que la console de partie sait faire pour la partie, sans que celle-ci la connaisse. */
export interface MatchReports {
  refresh(): void;
  report(message: string, accepted: boolean): void;
  announce(outcome: Outcome): void;
}

/** Les équipes préparées du joueur, lues dans le cache de chargement. */
export interface PresetSource {
  /** Celles déjà lues, vides sinon. */
  cached(): readonly TeamPreset[];
  /** Les relit ; `undefined` si la lecture échoue. */
  reload(): Promise<readonly TeamPreset[] | undefined>;
}

export interface MatchEffects {
  /** Ouvre le canal d'un joueur assis. */
  readonly connect: (matchId: string, seat: string, handlers: MatchHandlers) => MatchChannel;
  /** Ouvre le canal d'un spectateur. */
  readonly spectate: (matchId: string, side: PlayerId, handlers: MatchHandlers) => MatchChannel;
  readonly presets: PresetSource;
  /** Dit si le serveur tient encore ce joueur assis à cette partie. */
  readonly stillSeated: (matchId: string) => Promise<"seated" | "gone" | "unknown">;
  /** L'écran courant. */
  readonly stage: () => Stage["kind"];
  readonly go: (event: FlowEvent) => void;
  /** Rend les îlots d'avant-partie, que la partie alimente (`deploying`, `leaving`). */
  readonly showIslands: () => void;
  /** Lance le chargement du plateau, sans l'attendre. */
  readonly ensureBoard: () => void;
  readonly clearBoard: () => void;
  /** La partie vient d'être assise : la caméra se recentre sur sa carte. */
  readonly seated: (board: Board) => void;
  readonly reports: () => MatchReports;
  readonly notify: (message: string) => void;
  /** Quitte la table et revient au menu ; composée par la racine, qui tient aussi la file. */
  readonly leave: () => void;
  /** Rend compte d'une partie perdue : relit l'identité, puis le dit au joueur. */
  readonly connectionLost: () => Promise<void>;
}

export class MatchController {
  private matchOnTable: OnlineMatch | undefined;
  private channel: MatchChannel | undefined;
  /** Change à chaque partie refermée : une réponse tardive reconnaît qu'elle arrive trop tard. */
  private generation = 0;
  private friend: string | undefined;
  private spectatorCount = 0;
  private watchDeadline: ReturnType<typeof setTimeout> | undefined;
  private awaitingReply = false;
  private picked: Selection | undefined;
  private moving: MoveAnimation | undefined;
  private overTile: Coord | undefined;
  private announcement: Omit<DeploymentProps, "locale"> | undefined;
  private confirmingLeave = false;

  constructor(private readonly effects: MatchEffects) {}

  /** La partie arbitrée, absente tant que le serveur n'a pas assis le joueur. */
  get match(): OnlineMatch | undefined {
    return this.matchOnTable;
  }

  get hasChannel(): boolean {
    return this.channel !== undefined;
  }

  /** Sa propre partie, en déploiement ou en cours : ni regardée, ni finie. */
  get ownMatchRunning(): boolean {
    return (
      this.channel !== undefined && this.friend === undefined && this.matchOnTable?.isOver !== true
    );
  }

  /**
   * Un coup envoyé dont le serveur n'a pas encore répondu. Le client n'applique plus
   * rien lui-même : entre l'envoi et la vue, le plateau est celui d'avant, et il ne
   * doit accepter aucun second coup pour le même tour.
   */
  get pending(): boolean {
    return this.awaitingReply;
  }

  /** Le pseudo de l'ami regardé : présent, on est spectateur. */
  get watching(): string | undefined {
    return this.friend;
  }

  get spectators(): number {
    return this.spectatorCount;
  }

  get selection(): Selection | undefined {
    return this.picked;
  }

  get animation(): MoveAnimation | undefined {
    return this.moving;
  }

  get hovered(): Coord | undefined {
    return this.overTile;
  }

  /** L'annonce de déploiement à montrer, tant que la partie se prépare. */
  get deploying(): Omit<DeploymentProps, "locale"> | undefined {
    return this.announcement;
  }

  /** Vrai pendant que la fenêtre « abandonner ? » attend la réponse du joueur. */
  get leaving(): boolean {
    return this.confirmingLeave;
  }

  hover(coord: Coord | undefined): void {
    this.overTile = coord;
  }

  /** Assied le joueur à sa partie, après avoir refermé celle qu'il quitte. */
  sit(matchId: string, seat: string): void {
    this.close();
    this.effects.ensureBoard();
    this.channel = this.effects.connect(matchId, seat, this.handlersFor(false, matchId));
  }

  /**
   * Regarder la partie d'un ami. Un refus du serveur ne se voit qu'à l'absence de vue —
   * le socket est refusé avant d'exister — d'où l'échéance.
   */
  watch(friend: string, matchId: string, side: PlayerId): void {
    this.close();
    this.effects.notify("");
    this.friend = friend;
    this.effects.go({ kind: "seek", seeking: "watch", friend });
    this.effects.ensureBoard();
    this.channel = this.effects.spectate(matchId, side, this.handlersFor(true, matchId));
    this.watchDeadline = setTimeout(() => {
      if (this.matchOnTable !== undefined) return;
      this.effects.leave();
      this.effects.notify(messages().social.menu.cannotWatch(friend));
    }, WATCH_TIMEOUT_MS);
  }

  /**
   * Referme le canal de partie et oublie tout ce qui en dépend. Au plus un canal est
   * ouvert à la fois : un second écrirait dans le même état que le premier.
   */
  close(): void {
    this.generation += 1;
    this.confirmingLeave = false;
    this.channel?.close();
    this.channel = undefined;
    this.friend = undefined;
    this.spectatorCount = 0;
    clearTimeout(this.watchDeadline);
    this.matchOnTable = undefined;
    this.awaitingReply = false;
    this.picked = undefined;
    this.moving = undefined;
    this.overTile = undefined;
    this.announcement = undefined;
    this.effects.clearBoard();
  }

  /**
   * Envoie le coup, et **ne déplace rien** : c'est la vue suivante qui fera bouger la
   * pièce et lancera l'animation. Anticiper localement laissait le plateau désynchronisé
   * dès qu'un coup était refusé — le serveur ne rediffuse pas de vue dans ce cas.
   */
  play(action: Action): Result<Action, ActionError> {
    if (this.matchOnTable === undefined) return { ok: false, error: { code: "game-over" } };

    const sent = this.matchOnTable.play(action);
    if (!sent.ok) return sent;

    this.awaitingReply = true;
    this.picked = undefined;
    return sent;
  }

  /**
   * Un clic sur le plateau, ou à côté (`undefined`) : sélectionne, désélectionne, ou rend
   * l'action à envoyer.
   */
  pick(coord: Coord | undefined): Action | undefined {
    if (this.matchOnTable === undefined) return undefined;

    const outcome = resolveClick(
      this.matchOnTable.legalActions,
      this.matchOnTable.state,
      this.picked,
      coord,
    );
    if (outcome.kind === "select") this.picked = outcome.selection;
    else if (outcome.kind === "clear") this.picked = undefined;
    else return outcome.action;
    return undefined;
  }

  /** Fait avancer l'animation du dernier coup ; la console se rafraîchit à sa fin. */
  advance(deltaMS: number): void {
    if (this.moving === undefined) return;
    this.moving = step(this.moving, deltaMS);
    if (this.moving === undefined) this.effects.reports().refresh();
  }

  /**
   * Partir d'une partie vivante sans abandonner la laisserait « en cours » à jamais dans
   * les deux historiques : la fenêtre `leave/` le demande. Rend vrai quand elle doit
   * s'ouvrir ; partir d'une partie regardée ou finie n'a rien à confirmer.
   */
  requestLeave(): boolean {
    if (this.friend !== undefined || this.matchOnTable === undefined || this.matchOnTable.isOver) {
      return false;
    }
    this.confirmingLeave = true;
    return true;
  }

  /** Le joueur confirme : l'abandon part avant que la table soit vidée. */
  confirmLeave(): void {
    this.confirmingLeave = false;
    this.channel?.submit({ kind: "resign" });
  }

  cancelLeave(): void {
    this.confirmingLeave = false;
  }

  /**
   * Une vue reçue du serveur fait autorité. Elle referme le coup en attente et efface
   * la sélection, qui décrivait une position que le serveur vient de remplacer.
   *
   * `movement` est ce que la vue a fait bouger — son propre coup comme celui de
   * l'adversaire, qui s'anime donc désormais lui aussi.
   */
  private adopt(movement?: Movement): void {
    this.awaitingReply = false;
    this.picked = undefined;
    this.moving =
      movement === undefined || this.matchOnTable === undefined
        ? undefined
        : startMove(movement.pieceId, movement.from, movement.to, this.matchOnTable.board);
    this.effects.reports().refresh();
  }

  /**
   * Les gestionnaires d'une partie, assis ou spectateur. Un spectateur ne reçoit ni
   * annonce de déploiement ni coups légaux : seule la vue du camp qu'il suit.
   */
  private handlersFor(spectating: boolean, matchId: string): MatchHandlers {
    // Les équipes préparées déjà lues (l'écran des équipes les a peut-être chargées) servent
    // aussitôt ; elles se relisent pendant l'annonce, et l'écran reprend la réponse.
    let presets = this.effects.presets.cached();
    let lastRemaining: number | undefined;
    if (!spectating) {
      const generation = this.generation;
      void this.effects.presets.reload().then((reloaded) => {
        if (reloaded === undefined || generation !== this.generation) return;
        presets = reloaded;
        if (this.announcement !== undefined) {
          this.announcement = { ...this.announcement, presets };
          this.effects.showIslands();
        }
      });
    }
    return {
      onSeated: ({ player, board, rulesetVersion, view }) => {
        clearTimeout(this.watchDeadline);
        this.matchOnTable = new OnlineMatch(
          board,
          rulesetFor(rulesetVersion),
          player,
          // Un spectateur n'envoie rien : le serveur refuserait de toute façon.
          (action) => (spectating ? undefined : this.channel?.submit(action)),
          view,
        );
        this.effects.seated(this.matchOnTable.board);
        this.announcement = undefined;
        this.effects.showIslands();
        this.effects.go({ kind: "seated", spectating });
        this.adopt();
      },
      onDeployment: ({ player, scenario, board, rulesetVersion, deployment }) => {
        // Le compte à rebours repart de chaque annonce (une reconnexion en renvoie une),
        // pas d'un simple changement de verrou, qui ne dit rien du temps.
        const receivedAt =
          this.announcement === undefined || deployment.remainingMs !== lastRemaining
            ? performance.now()
            : this.announcement.receivedAt;
        lastRemaining = deployment.remainingMs;
        this.announcement = {
          player,
          scenario,
          board,
          rulesetVersion,
          deployment,
          receivedAt,
          presets,
          rejection: this.announcement?.rejection,
          onDeploy: (team) => {
            if (this.announcement !== undefined) {
              this.announcement = { ...this.announcement, rejection: undefined };
            }
            this.channel?.deploy(team);
          },
        };
        this.effects.showIslands();
        this.effects.go({ kind: "deploying" });
      },
      onView: (incoming) => {
        this.adopt(this.matchOnTable?.receive(incoming));
        if (incoming.outcome !== null) this.effects.reports().announce(incoming.outcome);
      },
      onRejected: (rejection) => {
        if (this.effects.stage() === "deploying" && this.announcement !== undefined) {
          this.announcement = { ...this.announcement, rejection: describeRejection(rejection) };
          this.effects.showIslands();
          return;
        }
        // Rien à annuler : le coup n'avait pas été appliqué. Il reste au joueur d'en
        // jouer un autre, et c'est toujours son tour.
        this.awaitingReply = false;
        this.effects.reports().report(describeRejection(rejection), false);
      },
      onOutdated: (expected) => {
        this.effects.reports().report(messages().game.outdated(expected), false);
      },
      onStatus: (state) => {
        if (state === "reconnecting" && this.matchOnTable !== undefined) {
          this.effects.reports().report(messages().game.reconnecting, false);
        }
        if (state === "unreachable" && !spectating) void this.leaveIfUnseated(matchId);
      },
      onSpectators: (count) => {
        this.spectatorCount = count;
        this.effects.reports().refresh();
      },
      // Accepté par le serveur : la première vue peut attendre la fin du déploiement.
      onWatching: () => clearTimeout(this.watchDeadline),
    };
  }

  /**
   * Les reconnexions échouent : si la partie n'est plus celle de ce client (session
   * expirée, partie close), on la quitte, et l'identité relue dit où revenir. Un réseau
   * coupé, lui, laisse le canal réessayer.
   */
  private async leaveIfUnseated(matchId: string): Promise<void> {
    const generation = this.generation;
    if ((await this.effects.stillSeated(matchId)) !== "gone" || generation !== this.generation) {
      return;
    }
    this.effects.leave();
    await this.effects.connectionLost();
  }
}
