import type { PlayerId } from "@occulis/core";
import {
  PROTOCOL_VERSION,
  type QueueClientMessage,
  type QueueIntent,
  type QueueServerMessage,
  type RoomFault,
} from "@occulis/protocol";
import { type ChannelStatus, openChannel } from "./channel.js";
import { OFFLINE, type Session, fromQueue } from "./session.js";

/**
 * Le canal de la file d'attente : il transporte, `session.ts` interprète.
 *
 * Les trois façons d'entrer en partie — appariement rapide, ouverture d'un salon
 * privé, entrée par code — passent par **une seule** connexion : le serveur ne doit
 * pouvoir faire attendre un joueur qu'à un endroit à la fois (docs/technical/server.md,
 * `QueueDO`). Changer d'intention, c'est donc refermer ce canal et en rouvrir un.
 */
export interface QueueChannel {
  close(): void;
}

export interface QueueHandlers {
  readonly onWaiting: () => void;
  readonly onHosting: (code: string) => void;
  /** Le code saisi n'a mené à aucune partie : personne n'est assis. */
  readonly onFault: (fault: RoomFault) => void;
  readonly onSeated: (seat: QueueSeat) => void;
  readonly onOutdated: (expected: number) => void;
  readonly onStatus: (status: ChannelStatus) => void;
}

export interface QueueSeat {
  readonly matchId: string;
  readonly seat: string;
  readonly player: PlayerId;
}

export function joinQueue(intent: QueueIntent, handlers: QueueHandlers): QueueChannel {
  let session: Session = OFFLINE;

  const receive = (message: QueueServerMessage): void => {
    session = fromQueue(session, message);
    const phase = session.phase;

    switch (phase.kind) {
      case "queued":
        return handlers.onWaiting();
      case "hosting":
        return handlers.onHosting(phase.code);
      case "room-fault":
        // La file n'a plus rien à dire : garder le canal ouvert ferait attendre
        // un adversaire que ce code n'amènera jamais.
        channel.close();
        return handlers.onFault(phase.fault);
      case "outdated":
        return handlers.onOutdated(phase.expected);
      case "seated":
        // Le siège est acquis : la suite se joue sur le canal de la partie.
        channel.close();
        if (phase.player === undefined) return;
        return handlers.onSeated({
          matchId: phase.matchId,
          seat: phase.seat,
          player: phase.player,
        });
      case "offline":
        return;
    }
  };

  // Renvoyée à chaque reconnexion : c'est elle qui remet le joueur en attente, et
  // qui rend à l'hôte le code de son salon plutôt qu'un nouveau.
  const channel = openChannel<QueueServerMessage, QueueClientMessage>({
    // L'identité vient du cookie de session, résolue par le Worker : rien à annoncer.
    path: "/api/queue",
    hello: { kind: "hello", protocol: PROTOCOL_VERSION, intent },
    onMessage: receive,
    onStatus: handlers.onStatus,
  });

  return { close: () => channel.close() };
}
