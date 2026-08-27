import type { Action, ActionError, PlayerId, PlayerView } from "@occulis/core";

/**
 * Version du protocole, négociée à la connexion. Un client téléchargé embarque un
 * vieux `core` et calcule donc les coups légaux avec de vieilles règles : le serveur
 * doit pouvoir le refuser explicitement plutôt que le laisser diverger en silence
 * (docs/architecture.md section 1).
 */
export const PROTOCOL_VERSION = 1;

/** `PlayerView` contient des `Set`/`Map`, que `JSON.stringify` sérialise en `{}`. */
export interface WireView {
  readonly player: PlayerId;
  readonly activePlayer: PlayerId;
  readonly turn: number;
  readonly outcome: PlayerView["outcome"];
  readonly visible: readonly string[];
  readonly ownPieces: PlayerView["ownPieces"];
  readonly visibleEnemies: PlayerView["visibleEnemies"];
  readonly ghosts: PlayerView["ghosts"];
}

export function encodeView(view: PlayerView): WireView {
  return { ...view, visible: [...view.visible] };
}

export type ClientMessage =
  | { readonly kind: "hello"; readonly protocol: number }
  | { readonly kind: "action"; readonly action: Action };

export type ServerMessage =
  | { readonly kind: "view"; readonly view: WireView }
  | { readonly kind: "rejected"; readonly error: ActionError }
  | { readonly kind: "protocol-mismatch"; readonly expected: number };
