/**
 * Le protocole entre le client et le serveur.
 *
 * Paquet partagé, et non module de `apps/server` : `apps/web` doit parler exactement
 * le même protocole, et deux définitions séparées auraient dérivé au premier ajout.
 * Il ne contient que des types et la conversion de sérialisation — aucune règle de
 * jeu (elle vit dans `@occulis/core`), aucun transport (il vit dans chaque app).
 */
import type { Action, ActionError, PlayerId, PlayerView } from "@occulis/core";

/**
 * Refus prononcé par le serveur et non par les règles : le siège qui a envoyé
 * l'action n'avait pas le droit de le faire. `@occulis/core` ne peut pas le
 * connaître — il ne sait pas qui parle, seulement quelle pièce bouge.
 */
export type SeatDenial =
  | { readonly code: "unknown-seat" }
  | { readonly code: "not-your-turn"; readonly activePlayer: PlayerId };

/**
 * Version du protocole, négociée à la connexion. Un client téléchargé embarque un
 * vieux `core` et calcule donc les coups légaux avec de vieilles règles : le serveur
 * doit pouvoir le refuser explicitement plutôt que le laisser diverger en silence
 * (docs/architecture.md section 1).
 */
export const PROTOCOL_VERSION = 4;

/** `PlayerView` contient des `Set`/`Map`, que `JSON.stringify` sérialise en `{}`. */
export interface WireView {
  readonly player: PlayerId;
  readonly activePlayer: PlayerId;
  readonly turn: number;
  readonly outcome: PlayerView["outcome"];
  /** Coups légaux du destinataire, calculés par le serveur (`PlayerView`). */
  readonly legalActions: PlayerView["legalActions"];
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
  /**
   * Envoyé une fois la version acceptée. Dit au client de quel camp il tient le
   * siège — il ne le sait pas autrement, c'est le jeton qui le détermine — et sur
   * quelle carte se joue la partie : le client doit dessiner exactement celle sur
   * laquelle le serveur calcule, et les deux registres sont encore séparés.
   */
  | {
      readonly kind: "welcome";
      readonly player: PlayerId;
      readonly scenario: string;
      readonly rulesetVersion: string;
    }
  | { readonly kind: "view"; readonly view: WireView }
  | { readonly kind: "rejected"; readonly error: Rejection }
  | { readonly kind: "protocol-mismatch"; readonly expected: number };

/** File d'attente : protocole distinct, la partie n'existe pas encore. */

/**
 * Ce qu'un joueur demande en se connectant à la file. Les trois intentions passent
 * par le **même** canal, et non par trois routes : le salon privé et l'appariement
 * se disputent le même joueur — il ne doit pouvoir attendre qu'à un seul endroit à
 * la fois, et un seul Durable Object mono-threadé le garantit sans verrou
 * (docs/architecture.md section 2).
 */
export type QueueIntent =
  /** Appariement automatique avec le premier adversaire disponible. */
  | { readonly kind: "quick" }
  /** Ouverture d'un salon privé : le serveur répond par le code à transmettre. */
  | { readonly kind: "host" }
  /** Entrée dans le salon privé désigné par ce code. */
  | { readonly kind: "join"; readonly code: string };

export type QueueClientMessage = {
  readonly kind: "hello";
  readonly protocol: number;
  readonly intent: QueueIntent;
};

/** Pourquoi un code de salon n'a mené à aucune partie. */
export type RoomFault =
  /** Aucun salon ouvert sous ce code — faute de frappe, ou hôte reparti. */
  | { readonly code: "unknown" }
  /** Le code est celui de son propre salon : personne ne joue contre soi-même. */
  | { readonly code: "own" };

export type QueueServerMessage =
  | { readonly kind: "waiting" }
  /**
   * Salon privé ouvert. Le code est tiré par le serveur et non par le client :
   * lui seul voit tous les salons, donc lui seul peut en garantir l'unicité.
   */
  | { readonly kind: "hosting"; readonly code: string }
  | { readonly kind: "room-fault"; readonly fault: RoomFault }
  | {
      readonly kind: "matched";
      readonly matchId: string;
      readonly player: PlayerId;
      /** Jeton de siège, à repasser en clair à la connexion à la partie. */
      readonly seat: string;
    }
  | { readonly kind: "protocol-mismatch"; readonly expected: number };
