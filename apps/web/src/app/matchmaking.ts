import type { QueueIntent, RoomFault } from "@occulis/protocol";
import { messages } from "../locale/current.js";
import {
  type QueueChannel,
  type QueueHandlers,
  type QueueProposal,
  type QueueSeat,
  joinQueue,
} from "../net/queue-channel.js";
import type { FlowEvent, QueueSeeking } from "../ui/flow.js";
import { describeRoomFault } from "../ui/messages.js";
import type { MatchFound } from "./islands.js";

export interface MatchmakingEffects {
  readonly go: (event: FlowEvent) => void;
  /** Un mot sur l'écran de menu. */
  readonly notify: (message: string) => void;
  /** Un mot sur l'écran d'attente. */
  readonly notifyWaiting: (message: string) => void;
  /** Redessine les îlots : la fenêtre de partie trouvée en est un. */
  readonly showIslands: () => void;
  /** La file a trouvé une partie : le joueur s'y assied. */
  readonly seated: (matchId: string, seat: string) => void;
  /** Le client est trop ancien pour le serveur. */
  readonly outdated: (expected: number) => void;
}

/**
 * La file d'attente : appariement rapide, salon privé ou entrée par code, puis la fenêtre
 * d'acceptation d'une partie trouvée. Au plus une file à la fois (`net/queue-channel.ts`).
 */
export class Matchmaking {
  private queue: QueueChannel | undefined;
  private found: MatchFound | undefined;

  constructor(private readonly effects: MatchmakingEffects) {}

  /** Vrai tant que le joueur attend une partie. */
  get searching(): boolean {
    return this.queue !== undefined;
  }

  /** La partie proposée, tant que la fenêtre d'acceptation est ouverte. */
  get proposal(): MatchFound | undefined {
    return this.found;
  }

  /** Le joueur demande une partie ; `code` n'accompagne que « rejoindre ». */
  seek(seeking: QueueSeeking, code?: string): void {
    this.effects.notify("");
    this.effects.go({ kind: "seek", seeking });
    this.queue = joinQueue(intentOf(seeking, code), this.handlers());
  }

  /** Quitte la file : plus d'attente, plus de proposition. */
  close(): void {
    this.queue?.close();
    this.queue = undefined;
    this.found = undefined;
  }

  private handlers(): QueueHandlers {
    return {
      onWaiting: () => undefined,
      onHosting: (code) => this.effects.go({ kind: "hosting", code }),
      onFault: (fault) => this.refused(fault),
      onProposal: (proposal) => this.propose(proposal),
      onLapsed: (requeued) => this.lapse(requeued),
      onSeated: (seat) => this.seat(seat),
      onOutdated: (expected) => this.effects.outdated(expected),
      onStatus: () => undefined,
    };
  }

  /** Le code saisi n'a mené à aucune partie. */
  private refused(fault: RoomFault): void {
    this.queue = undefined;
    this.effects.go({ kind: "menu" });
    this.effects.notify(describeRoomFault(fault));
  }

  /**
   * Un adversaire est trouvé, puis chaque acceptation. Le compte à rebours part de la
   * première proposition : une acceptation ne le relance pas.
   */
  private propose({ remainingMs, accepted }: QueueProposal): void {
    const first = this.found;
    this.found = {
      remainingMs: first?.remainingMs ?? remainingMs,
      receivedAt: first?.receivedAt ?? performance.now(),
      accepted,
      onAccept: () => this.queue?.accept(),
      onDecline: () => this.queue?.decline(),
    };
    this.effects.showIslands();
    this.effects.go({ kind: "proposed" });
  }

  /** La proposition est tombée ; `requeued` : le joueur avait accepté, il attend de nouveau. */
  private lapse(requeued: boolean): void {
    this.found = undefined;
    this.effects.showIslands();
    if (!requeued) this.queue = undefined;
    this.effects.go({ kind: "lapsed", requeued });

    const m = messages().prepare.lapsed;
    if (requeued) {
      this.effects.notify("");
      this.effects.notifyWaiting(m.requeued);
    } else {
      this.effects.notify(m.dropped);
    }
  }

  private seat({ matchId, seat }: QueueSeat): void {
    this.queue = undefined;
    this.found = undefined;
    this.effects.showIslands();
    this.effects.seated(matchId, seat);
  }
}

/** L'entrée de menu choisie, dans la forme que la file d'attente attend. */
function intentOf(seeking: QueueSeeking, code: string | undefined): QueueIntent {
  if (seeking === "join") return { kind: "join", code: code ?? "" };
  if (seeking === "host") return { kind: "host" };
  return { kind: "quick" };
}
