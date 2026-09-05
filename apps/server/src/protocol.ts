import type { Action, ActionError, PlayerId, PlayerView } from "@occulis/core";
import type { SeatDenial } from "./seating.js";

/**
 * Version du protocole, négociée à la connexion. Un client téléchargé embarque un
 * vieux `core` et calcule donc les coups légaux avec de vieilles règles : le serveur
 * doit pouvoir le refuser explicitement plutôt que le laisser diverger en silence
 * (docs/architecture.md section 1).
 */
export const PROTOCOL_VERSION = 2;

/** `PlayerView` contient des `Set`/`Map`, que `JSON.stringify` sérialise en `{}`. */
export interface WireView {
  readonly player: PlayerId;
  readonly activePlayer: PlayerId;
  readonly turn: number;
  readonly outcome: PlayerView["outcome"];
  readonly check: boolean;
  readonly visible: readonly string[];
  readonly ownPieces: PlayerView["ownPieces"];
  readonly visibleEnemies: PlayerView["visibleEnemies"];
  readonly ghosts: PlayerView["ghosts"];
}

export function encodeView(view: PlayerView): WireView {
  return { ...view, visible: [...view.visible] };
}

export function decodeView(wire: WireView): PlayerView {
  return { ...wire, visible: new Set(wire.visible) };
}

export type ClientMessage =
  | { readonly kind: "hello"; readonly protocol: number }
  | { readonly kind: "action"; readonly action: Action };

/** Un coup refusé l'est soit par les règles (`core`), soit par le siège (serveur). */
export type Rejection = ActionError | SeatDenial;

export type ServerMessage =
  /** Envoyé une fois la version acceptée : dit au client de quel camp il tient le siège. */
  | { readonly kind: "welcome"; readonly player: PlayerId }
  | { readonly kind: "view"; readonly view: WireView }
  | { readonly kind: "rejected"; readonly error: Rejection }
  | { readonly kind: "protocol-mismatch"; readonly expected: number };

/** File d'attente : protocole distinct, la partie n'existe pas encore. */
export type QueueClientMessage = { readonly kind: "hello"; readonly protocol: number };

export type QueueServerMessage =
  | { readonly kind: "waiting" }
  | {
      readonly kind: "matched";
      readonly matchId: string;
      readonly player: PlayerId;
      /** Jeton de siège, à repasser en clair à la connexion à la partie. */
      readonly seat: string;
    }
  | { readonly kind: "protocol-mismatch"; readonly expected: number };
