import type { Action, PlayerId, PlayerView } from "@occulis/core";
import {
  PROTOCOL_VERSION,
  type ClientMessage,
  type Rejection,
  type ServerMessage,
} from "@occulis/protocol";
import { type ChannelStatus, openChannel } from "./channel.js";
import { type Session, fromMatch, seatedAt, watchingAt } from "./session.js";

/**
 * Le canal d'une partie : il transporte, `session.ts` interprète.
 *
 * Ce module ne décide de rien non plus — il traduit un état de session en appels,
 * pour que la racine de composition n'ait pas à connaître la forme des messages.
 */
export interface MatchChannel {
  submit(action: Action): void;
  close(): void;
}

export interface MatchHandlers {
  /** Première vue et carte annoncée : de quoi construire la partie côté client. */
  readonly onSeated: (context: SeatedContext) => void;
  readonly onView: (view: PlayerView) => void;
  readonly onRejected: (rejection: Rejection) => void;
  readonly onOutdated: (expected: number) => void;
  readonly onStatus: (status: ChannelStatus) => void;
  /** Le nombre d'amis qui regardent ce joueur a changé. */
  readonly onSpectators?: (count: number) => void;
}

export interface SeatedContext {
  readonly player: PlayerId;
  readonly scenario: string;
  readonly rulesetVersion: string;
  readonly view: PlayerView;
  /** Un ami qui regarde : `player` est le camp suivi, et il ne joue rien. */
  readonly spectating: boolean;
}

export function connectToMatch(
  matchId: string,
  seat: string,
  handlers: MatchHandlers,
): MatchChannel {
  return connect(
    seatedAt(matchId, seat),
    `/match/${encodeURIComponent(matchId)}?seat=${encodeURIComponent(seat)}`,
    handlers,
  );
}

/**
 * Regarder la partie d'un ami, de son côté. Le serveur décide si c'est permis ; un refus
 * ferme le socket avant toute vue, et la reconnexion le répétera — c'est `onSeated` qui
 * n'arrivera jamais, à l'appelant de prévoir une échéance.
 */
export function watchMatch(matchId: string, side: PlayerId, handlers: MatchHandlers): MatchChannel {
  return connect(watchingAt(matchId), `/match/${encodeURIComponent(matchId)}/watch?side=${side}`, handlers);
}

function connect(start: Session, path: string, handlers: MatchHandlers): MatchChannel {
  let session: Session = start;
  let seated = false;
  let spectators = 0;

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
    if (phase.spectators !== spectators) {
      spectators = phase.spectators;
      handlers.onSpectators?.(spectators);
    }

    // La partie ne peut être construite qu'une fois le camp, la carte **et** une
    // première vue connus : ils arrivent en deux messages (`welcome` puis `view`).
    const { player, scenario, rulesetVersion, view } = phase;
    if (player === undefined || scenario === undefined || rulesetVersion === undefined) return;
    if (view === undefined) return;

    if (seated) {
      handlers.onView(view);
      return;
    }
    seated = true;
    handlers.onSeated({ player, scenario, rulesetVersion, view, spectating: phase.spectating });
  };

  // Une reconnexion renvoie `hello`, ce qui fait rediffuser `welcome` puis la vue
  // courante : `seated` reste vrai, et la vue reçue rétablit simplement la position.
  // Aucun protocole de reprise n'est nécessaire — le serveur reconstruit depuis le log.
  const channel = openChannel<ServerMessage, ClientMessage>({
    path,
    hello: { kind: "hello", protocol: PROTOCOL_VERSION },
    onMessage: receive,
    onStatus: handlers.onStatus,
  });

  return {
    submit: (action) => channel.send({ kind: "action", action }),
    close: () => channel.close(),
  };
}
