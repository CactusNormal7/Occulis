import type { Challenge, Friend, FriendsOverview, Relation, SocialServerMessage } from "@occulis/protocol";
import { messages } from "../locale/current.js";

/**
 * L'état social vu d'une page — le menu du jeu comme le profil. Module pur : il réduit
 * la liste lue par `GET /api/friends` et les poussées du canal social en un état
 * affichable, sans réseau ni DOM.
 *
 * La liste fait foi ; une poussée ne fait que la retoucher (présence, non-lus, défis) ou
 * dire qu'elle est périmée (`stale`), auquel cas la page la relit. Rien n'est déduit qui
 * ne vienne du serveur.
 */
export interface SocialState {
  readonly overview: FriendsOverview | undefined;
  /** Les défis reçus, un par ami au plus. */
  readonly incoming: readonly Challenge[];
  /** Les amis défiés par ce joueur, en attente de leur réponse. */
  readonly outgoing: readonly string[];
}

export const EMPTY_SOCIAL: SocialState = { overview: undefined, incoming: [], outgoing: [] };

export interface SocialUpdate {
  readonly state: SocialState;
  /** La liste ne dit plus vrai : une relation a changé, il faut la relire. */
  readonly stale: boolean;
}

export function withOverview(state: SocialState, overview: FriendsOverview): SocialState {
  // Un défi en attente vers quelqu'un qui n'est plus ami ne mènera nulle part.
  const friends = new Set(overview.friends.map((friend) => friend.id));
  return {
    overview,
    incoming: state.incoming.filter((challenge) => friends.has(challenge.from.id)),
    outgoing: state.outgoing.filter((id) => friends.has(id)),
  };
}

export function challenged(state: SocialState, friendId: string): SocialState {
  if (state.outgoing.includes(friendId)) return state;
  return { ...state, outgoing: [...state.outgoing, friendId] };
}

export function receive(state: SocialState, message: SocialServerMessage): SocialUpdate {
  switch (message.kind) {
    case "friend-request":
    case "friend-accepted":
    case "friends-changed":
      return { state, stale: true };

    case "presence":
      return {
        state: mapFriends(state, message.playerId, (friend) => ({ ...friend, online: message.online })),
        stale: false,
      };

    case "message":
      // Un message que l'on a soi-même envoyé revient aussi (pour les autres pages
      // ouvertes) : son expéditeur n'est alors pas un ami, et rien ne bouge.
      return {
        state: mapFriends(state, message.message.sender, (friend) => ({ ...friend, unread: friend.unread + 1 })),
        stale: false,
      };

    case "challenge": {
      const from = message.challenge.from.id;
      return {
        state: {
          ...state,
          incoming: [...state.incoming.filter((challenge) => challenge.from.id !== from), message.challenge],
        },
        stale: false,
      };
    }

    case "challenge-cancelled":
      return {
        state: {
          ...state,
          incoming: state.incoming.filter((challenge) => challenge.from.id !== message.from),
          outgoing: state.outgoing.filter((id) => id !== message.to),
        },
        stale: false,
      };

    case "matched":
    case "protocol-mismatch":
      return { state, stale: false };
  }
}

/** Les messages d'un ami viennent d'être lus : son compteur retombe. */
export function readAll(state: SocialState, friendId: string): SocialState {
  return mapFriends(state, friendId, (friend) => ({ ...friend, unread: 0 }));
}

export function friendOf(state: SocialState, friendId: string): Friend | undefined {
  return state.overview?.friends.find((friend) => friend.id === friendId);
}

/**
 * Ce qu'est un autre joueur pour moi, d'après la liste ; `undefined` tant qu'elle n'est
 * pas lue. C'est ce qui décide si l'historique propose encore de l'ajouter en ami.
 */
export function relationTo(state: SocialState, playerId: string): Relation | undefined {
  const overview = state.overview;
  if (overview === undefined) return undefined;
  const has = (list: readonly { readonly id: string }[]) => list.some((player) => player.id === playerId);
  if (has(overview.friends)) return "friend";
  if (has(overview.blocked)) return "blocked";
  if (has(overview.outgoing)) return "outgoing";
  if (has(overview.incoming)) return "incoming";
  return "none";
}

/** Le total des messages non lus, pour un compteur d'onglet. */
export function unreadTotal(state: SocialState): number {
  return (state.overview?.friends ?? []).reduce((total, friend) => total + friend.unread, 0);
}

function mapFriends(state: SocialState, friendId: string, change: (friend: Friend) => Friend): SocialState {
  const overview = state.overview;
  if (overview === undefined || !overview.friends.some((friend) => friend.id === friendId)) return state;
  return {
    ...state,
    overview: {
      ...overview,
      friends: overview.friends.map((friend) => (friend.id === friendId ? change(friend) : friend)),
    },
  };
}

/** Le texte d'un refus des routes d'amis ; `undefined` si le code n'est pas le leur. */
export function socialMessage(code: string | undefined): string | undefined {
  const known: Readonly<Record<string, string>> = messages().social.errors;
  return code === undefined || !Object.hasOwn(known, code) ? undefined : known[code];
}

/** « en ligne », « en partie », « absent » : ce que la liste dit d'un ami. */
export function presenceLabel(friend: Friend): string {
  const m = messages().social.presence;
  if (friend.matches.length > 0 && friend.online) return m.playing;
  return friend.online ? m.online : m.offline;
}
