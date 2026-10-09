/**
 * Le protocole entre le client et le serveur.
 *
 * Paquet partagé, et non module de `apps/server` : `apps/web` doit parler exactement
 * le même protocole, et deux définitions séparées auraient dérivé au premier ajout.
 * Il ne contient que des types et la conversion de sérialisation — aucune règle de
 * jeu (elle vit dans `@occulis/core`), aucun transport (il vit dans chaque app).
 */
import type { Action, ActionError, Coord, PlayerId, PlayerView, TeamEntry, TeamError } from "@occulis/core";

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
export const PROTOCOL_VERSION = 5;

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
  | { readonly kind: "action"; readonly action: Action }
  /** L'équipe du joueur, posée dans sa zone. **Définitive** : on ne se rétracte pas. */
  | { readonly kind: "deploy"; readonly team: readonly TeamEntry[] };

/** Refus d'un geste qui n'a pas sa place dans la phase en cours, ou qui n'a pas de forme lisible. */
export type PhaseDenial =
  /** Un coup avant la fin du déploiement, ou une équipe après. */
  | { readonly code: "wrong-phase" }
  /** Une seconde équipe : la première est verrouillée. */
  | { readonly code: "already-locked" }
  /** Une équipe qui n'a pas la forme d'une liste de `{ kind, coord }` (`parseTeam()`). */
  | { readonly code: "malformed-team" };

/**
 * Un geste refusé l'est par les règles (`core` : un coup, une équipe), par le siège ou
 * par la phase de la partie (serveur).
 */
export type Rejection = ActionError | TeamError | SeatDenial | PhaseDenial;

/**
 * Ce qu'un joueur montre de lui à son adversaire, à l'annonce de la partie. Rien que de
 * public : le pseudo, l'Elo, le bilan, et les faits d'armes qu'il a choisi d'exhiber.
 */
export interface PlayerCard {
  readonly handle: string;
  readonly elo: number;
  readonly played: number;
  readonly won: number;
  /** Identifiants de faits d'armes (`apps/server/src/feats/catalog.ts`), leurs textes étant côté client. */
  readonly feats: readonly string[];
}

/** Qui a verrouillé son équipe, du point de vue du destinataire. */
export interface Locks {
  readonly self: boolean;
  readonly opponent: boolean;
}

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
  /**
   * La partie est en déploiement. Envoyé à chaque connexion tant qu'elle l'est : le client
   * qui revient retrouve sa zone, le temps restant et l'état des verrous. `remainingMs`
   * plutôt qu'une échéance : l'horloge du client n'est pas celle du serveur.
   */
  | {
      readonly kind: "deployment";
      readonly zone: readonly Coord[];
      /** La zone d'en face — elle fait partie de la carte, publique ; jamais les pièces qui s'y posent. */
      readonly opponentZone: readonly Coord[];
      readonly defaultTeam: readonly TeamEntry[];
      readonly remainingMs: number;
      readonly locks: Locks;
      readonly self: PlayerCard;
      readonly opponent: PlayerCard;
      readonly rated: boolean;
    }
  /** Un verrou a changé — le sien, ou celui d'en face. */
  | { readonly kind: "deployment-update"; readonly locks: Locks }
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

export type * from "./admin.js";
export type * from "./me.js";
