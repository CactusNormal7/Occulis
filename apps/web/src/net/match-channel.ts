import type { Action, PlayerId, PlayerView, TeamEntry } from "@occulis/core";
import {
  PROTOCOL_VERSION,
  type ClientMessage,
  type Rejection,
  type ServerMessage,
} from "@occulis/protocol";
import { type ChannelStatus, openChannel } from "./channel.js";
import { type DeploymentState, type Session, fromMatch, seatedAt } from "./session.js";

/**
 * Le canal d'une partie : il transporte, `session.ts` interprète.
 *
 * Ce module ne décide de rien non plus — il traduit un état de session en appels,
 * pour que la racine de composition n'ait pas à connaître la forme des messages.
 */
export interface MatchChannel {
  submit(action: Action): void;
  /** Envoie l'équipe posée ; le serveur la verrouille ou la refuse. */
  deploy(team: readonly TeamEntry[]): void;
  close(): void;
}

export interface MatchHandlers {
  /** Première vue et carte annoncée : de quoi construire la partie côté client. */
  readonly onSeated: (context: SeatedContext) => void;
  /**
   * La partie se déploie : à l'annonce (et à chaque reconnexion), puis à chaque verrou
   * posé. Jamais après la première vue.
   */
  readonly onDeployment: (context: DeploymentContext) => void;
  readonly onView: (view: PlayerView) => void;
  readonly onRejected: (rejection: Rejection) => void;
  readonly onOutdated: (expected: number) => void;
  readonly onStatus: (status: ChannelStatus) => void;
}

export interface SeatedContext {
  readonly player: PlayerId;
  readonly scenario: string;
  readonly rulesetVersion: string;
  readonly view: PlayerView;
}

export interface DeploymentContext {
  readonly player: PlayerId;
  readonly scenario: string;
  readonly rulesetVersion: string;
  readonly deployment: DeploymentState;
}

export function connectToMatch(
  matchId: string,
  seat: string,
  handlers: MatchHandlers,
): MatchChannel {
  let session: Session = seatedAt(matchId, seat);
  let seated = false;

  const receive = (message: ServerMessage): void => {
    session = fromMatch(session, message);
    const phase = session.phase;

    if (phase.kind === "outdated") {
      handlers.onOutdated(phase.expected);
      return;
    }
    if (phase.kind !== "seated") return;

    if (session.rejection !== undefined) {
      handlers.onRejected(session.rejection);
      return;
    }

    // La partie ne peut être construite qu'une fois le camp, la carte **et** une
    // première vue connus : ils arrivent en deux messages (`welcome` puis `view`).
    const { player, scenario, rulesetVersion, view, deployment } = phase;
    if (player === undefined || scenario === undefined || rulesetVersion === undefined) return;
    if (view === undefined) {
      if (deployment !== undefined && (message.kind === "deployment" || message.kind === "deployment-update")) {
        handlers.onDeployment({ player, scenario, rulesetVersion, deployment });
      }
      return;
    }

    if (seated) {
      handlers.onView(view);
      return;
    }
    seated = true;
    handlers.onSeated({ player, scenario, rulesetVersion, view });
  };

  // Une reconnexion renvoie `hello`, ce qui fait rediffuser `welcome` puis la vue
  // courante : `seated` reste vrai, et la vue reçue rétablit simplement la position.
  // Aucun protocole de reprise n'est nécessaire — le serveur reconstruit depuis le log.
  const channel = openChannel<ServerMessage, ClientMessage>({
    path: `/match/${encodeURIComponent(matchId)}?seat=${encodeURIComponent(seat)}`,
    hello: { kind: "hello", protocol: PROTOCOL_VERSION },
    onMessage: receive,
    onStatus: handlers.onStatus,
  });

  return {
    submit: (action) => channel.send({ kind: "action", action }),
    deploy: (team) => channel.send({ kind: "deploy", team }),
    close: () => channel.close(),
  };
}
