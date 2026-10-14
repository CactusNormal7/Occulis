/**
 * Le système d'amis : les réponses des routes `/api/friends/*`, `/api/players/search`
 * et `/api/blocks/*`, et les messages du canal social (`/api/social`).
 *
 * Comme pour le profil, rien ici ne dépasse ce qu'un joueur a le droit de savoir : la
 * fiche d'un ami ne montre que ses parties rejouées **de son point de vue**, et un ami
 * qui regarde une partie ne reçoit que la vue du camp qu'il suit. Un blocage ne se
 * signale jamais à celui qui le subit. Les horodatages sont en millisecondes.
 */
import type { PlayerId } from "@occulis/core";
import type { MeRecord } from "./me.js";

/** Ce que je suis pour un autre joueur, vu de mon côté. */
export type Relation =
  | "friend"
  /** Il m'a demandé en ami. */
  | "incoming"
  /** Je l'ai demandé en ami. */
  | "outgoing"
  /** Je l'ai bloqué. */
  | "blocked"
  | "none";

export interface SocialPlayer {
  readonly id: string;
  readonly handle: string;
}

/** Une partie en cours d'un ami, telle que la liste d'amis la montre. */
export interface LiveMatch {
  readonly id: string;
  /** Le camp que tient l'ami : c'est sa vue qu'un spectateur recevra. */
  readonly side: PlayerId;
  readonly opponent: string;
  readonly startedAt: number;
  /** L'ami accepte les spectateurs, et je ne suis pas son adversaire. */
  readonly watchable: boolean;
}

export interface Friend extends SocialPlayer {
  readonly online: boolean;
  readonly since: number;
  readonly allowSpectators: boolean;
  /** Messages reçus de lui et pas encore lus. */
  readonly unread: number;
  readonly matches: readonly LiveMatch[];
}

export interface FriendRequest extends SocialPlayer {
  readonly createdAt: number;
}

export interface FriendsOverview {
  readonly friends: readonly Friend[];
  readonly incoming: readonly FriendRequest[];
  readonly outgoing: readonly FriendRequest[];
  readonly blocked: readonly SocialPlayer[];
}

export interface PlayerSearchResult extends SocialPlayer {
  readonly relation: Relation;
}

export interface FriendProfile extends SocialPlayer {
  readonly online: boolean;
  readonly since: number;
  readonly allowSpectators: boolean;
  readonly record: MeRecord;
  readonly elo: number;
}

export interface ChatMessage {
  readonly id: string;
  /** Identifiant de joueur de l'expéditeur. */
  readonly sender: string;
  readonly recipient: string;
  readonly body: string;
  readonly createdAt: number;
  readonly readAt: number | null;
}

export interface ChatPage {
  /** Du plus ancien au plus récent. */
  readonly messages: readonly ChatMessage[];
  /** D'autres messages plus anciens restent à charger (`?before=`). */
  readonly hasMore: boolean;
}

/** Une invitation à jouer, vivante tant que son auteur garde le jeu ouvert. */
export interface Challenge {
  readonly from: SocialPlayer;
  readonly to: SocialPlayer;
  readonly createdAt: number;
}

/**
 * Où s'ouvre le canal social. Seul le jeu peut s'asseoir à une partie : un défi exige
 * que son auteur ait le jeu ouvert, et l'annonce `matched` ne part que vers le jeu.
 */
export type SocialSurface = "game" | "profile";

export type SocialClientMessage = { readonly kind: "hello"; readonly protocol: number };

export type SocialServerMessage =
  | { readonly kind: "friend-request"; readonly from: SocialPlayer }
  | { readonly kind: "friend-accepted"; readonly friend: SocialPlayer }
  /** Une relation a changé (retrait, refus, annulation) : relire la liste. */
  | { readonly kind: "friends-changed" }
  | { readonly kind: "presence"; readonly playerId: string; readonly online: boolean }
  | { readonly kind: "message"; readonly message: ChatMessage }
  | { readonly kind: "challenge"; readonly challenge: Challenge }
  | { readonly kind: "challenge-cancelled"; readonly from: string; readonly to: string }
  | {
      readonly kind: "matched";
      readonly matchId: string;
      readonly player: PlayerId;
      /** Jeton de siège, comme celui de la file d'attente. */
      readonly seat: string;
    }
  | { readonly kind: "protocol-mismatch"; readonly expected: number };
