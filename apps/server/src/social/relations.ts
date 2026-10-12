import type { Relation } from "@occulis/protocol";

/**
 * Les relations entre joueurs, en logique pure : ce que vaut une demande d'ami selon
 * ce qui lie déjà les deux joueurs. Les requêtes (`social/queries.ts`) lisent les faits,
 * ce module décide.
 */

/** Une amitié se range sous une seule paire ordonnée (`friendships`, `CHECK`). */
export function pairOf(a: string, b: string): readonly [string, string] {
  return a < b ? [a, b] : [b, a];
}

/** Ce que la base sait des deux joueurs, du point de vue du premier. */
export interface RelationFacts {
  /** L'autre joueur a un compte : un profil anonymisé ou sans compte ne se demande pas. */
  readonly exists: boolean;
  readonly friend: boolean;
  readonly outgoing: boolean;
  readonly incoming: boolean;
  readonly iBlock: boolean;
  readonly theyBlock: boolean;
}

/**
 * La relation telle qu'on la montre. Être bloqué par l'autre ne s'y lit jamais : un
 * blocage qui se signalerait à celui qui le subit l'inviterait à le contourner.
 */
export function relationOf(facts: RelationFacts): Relation {
  if (facts.iBlock) return "blocked";
  if (facts.friend) return "friend";
  if (facts.incoming) return "incoming";
  if (facts.outgoing) return "outgoing";
  return "none";
}

export type RequestError =
  | "SELF"
  | "UNKNOWN_PLAYER"
  | "BLOCKED"
  | "UNAVAILABLE"
  | "ALREADY_FRIENDS"
  | "TOO_MANY_REQUESTS";

export type RequestDecision =
  | { readonly ok: true; readonly action: "send" | "accept" | "already-sent" }
  | { readonly ok: false; readonly code: RequestError };

/** Au-delà, les demandes sans réponse ressemblent à un démarchage. */
export const MAX_PENDING_REQUESTS = 50;

/**
 * Une demande vers quelqu'un qui vous a déjà demandé **accepte** la sienne : deux
 * personnes qui se cherchent en même temps ne doivent pas rester chacune en attente
 * de l'autre.
 */
export function decideRequest(
  self: string,
  other: string,
  facts: RelationFacts,
  pending: number,
): RequestDecision {
  if (self === other) return { ok: false, code: "SELF" };
  if (!facts.exists) return { ok: false, code: "UNKNOWN_PLAYER" };
  if (facts.iBlock) return { ok: false, code: "BLOCKED" };
  // Même réponse qu'un joueur indisponible, pour ne rien dire du blocage.
  if (facts.theyBlock) return { ok: false, code: "UNAVAILABLE" };
  if (facts.friend) return { ok: false, code: "ALREADY_FRIENDS" };
  if (facts.incoming) return { ok: true, action: "accept" };
  if (facts.outgoing) return { ok: true, action: "already-sent" };
  if (pending >= MAX_PENDING_REQUESTS) return { ok: false, code: "TOO_MANY_REQUESTS" };
  return { ok: true, action: "send" };
}

/** Qui peut regarder une partie, et de quel côté. */
export interface WatchFacts {
  readonly finished: boolean;
  /** Le spectateur est l'un des deux joueurs. */
  readonly player: boolean;
  /** Le joueur du camp suivi est ami du spectateur. */
  readonly friend: boolean;
  readonly allowSpectators: boolean;
}

export type WatchError = "MATCH_FINISHED" | "OWN_MATCH" | "NOT_FRIENDS" | "SPECTATORS_REFUSED";

/**
 * Un joueur ne regarde jamais sa propre partie : il verrait la vue du camp d'en face,
 * c'est-à-dire exactement ce que le fog lui refuse.
 */
export function decideWatch(facts: WatchFacts): WatchError | undefined {
  if (facts.finished) return "MATCH_FINISHED";
  if (facts.player) return "OWN_MATCH";
  if (!facts.friend) return "NOT_FRIENDS";
  if (!facts.allowSpectators) return "SPECTATORS_REFUSED";
  return undefined;
}
