import type { PlayerId, PlayerView } from "@occulis/core";
import {
  type QueueServerMessage,
  type Rejection,
  type ServerMessage,
  decodeView,
} from "@occulis/protocol";

/**
 * L'avancement d'une partie en ligne, du côté du client. Module pur : ni DOM, ni
 * WebSocket — il ne fait que réduire les messages reçus en un état affichable.
 *
 * Le client ne décide de rien : il ne connaît son camp qu'une fois assis
 * (`welcome`), et ne connaît la position que par les vues que le serveur lui envoie.
 * D'où un état qui n'est qu'un accumulateur de messages, sans logique de jeu.
 */
export type Phase =
  | { readonly kind: "offline" }
  | { readonly kind: "queued" }
  | {
      readonly kind: "seated";
      readonly matchId: string;
      readonly seat: string;
      /** Connu seulement à réception de `welcome` : c'est le jeton qui le détermine. */
      readonly player: PlayerId | undefined;
      /** Carte et règles annoncées par `welcome`, à faire correspondre localement. */
      readonly scenario: string | undefined;
      readonly rulesetVersion: string | undefined;
      readonly view: PlayerView | undefined;
    }
  /** Le serveur parle une autre version : ce client est trop vieux ou trop neuf. */
  | { readonly kind: "outdated"; readonly expected: number };

export interface Session {
  readonly phase: Phase;
  /** Dernier refus reçu, à montrer au joueur ; effacé au coup suivant. */
  readonly rejection: Rejection | undefined;
}

export const OFFLINE: Session = { phase: { kind: "offline" }, rejection: undefined };

/**
 * Une session déjà assise, sans être passée par la file : c'est ce que produit un
 * appariement une fois le canal de la file refermé et celui de la partie ouvert.
 */
export function seatedAt(matchId: string, seat: string): Session {
  return {
    phase: {
      kind: "seated",
      matchId,
      seat,
      player: undefined,
      scenario: undefined,
      rulesetVersion: undefined,
      view: undefined,
    },
    rejection: undefined,
  };
}

export function fromQueue(session: Session, message: QueueServerMessage): Session {
  switch (message.kind) {
    case "waiting":
      return { phase: { kind: "queued" }, rejection: undefined };
    case "matched":
      return {
        phase: {
          kind: "seated",
          matchId: message.matchId,
          seat: message.seat,
          player: message.player,
          scenario: undefined,
          rulesetVersion: undefined,
          view: undefined,
        },
        rejection: undefined,
      };
    case "protocol-mismatch":
      return { phase: { kind: "outdated", expected: message.expected }, rejection: undefined };
  }
}

export function fromMatch(session: Session, message: ServerMessage): Session {
  if (message.kind === "protocol-mismatch") {
    return { phase: { kind: "outdated", expected: message.expected }, rejection: undefined };
  }

  const phase = session.phase;
  // Un message de partie hors d'une partie n'a pas de place où atterrir : l'ignorer
  // vaut mieux que de fabriquer un siège dont on ne connaît ni l'identifiant ni le jeton.
  if (phase.kind !== "seated") return session;

  switch (message.kind) {
    case "welcome":
      return {
        phase: {
          ...phase,
          player: message.player,
          scenario: message.scenario,
          rulesetVersion: message.rulesetVersion,
        },
        rejection: undefined,
      };
    case "view":
      return { phase: { ...phase, view: decodeView(message.view) }, rejection: undefined };
    case "rejected":
      return { phase, rejection: message.error };
  }
}
