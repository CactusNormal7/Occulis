import type { Waiting } from "./pairing.js";

/**
 * La fenêtre d'acceptation, en logique pure : deux joueurs appariés par la file rapide
 * reçoivent une **proposition**, et la partie n'est créée que si tous deux l'acceptent
 * dans le délai. Sans elle, un joueur parti chercher un café se retrouvait assis dans une
 * partie qu'il ne jouerait pas, et son adversaire avec lui.
 *
 * Comme la file, elle vit dans le Durable Object global ; ce module n'en connaît rien.
 */
export const ACCEPT_MS = 15_000;

export interface Proposal {
  readonly id: string;
  /** `a` tiendra le camp A, `b` le camp B, comme à l'appariement. */
  readonly a: Waiting;
  readonly b: Waiting;
  readonly deadline: number;
  /** Les connexions qui ont accepté. */
  readonly accepted: readonly string[];
}

/** Une proposition tombée : qui revient en tête de file, et qui en sort. */
export interface Lapse {
  readonly proposal: Proposal;
  /** Ceux qui avaient accepté : ils ne sont pour rien dans l'échec. */
  readonly requeue: readonly Waiting[];
  /** Ceux qui ont refusé, laissé filer le délai ou fermé la connexion. */
  readonly dropped: readonly Waiting[];
}

export function propose(id: string, a: Waiting, b: Waiting, now: number): Proposal {
  return { id, a, b, deadline: now + ACCEPT_MS, accepted: [] };
}

export function membersOf(proposal: Proposal): readonly Waiting[] {
  return [proposal.a, proposal.b];
}

/** La proposition où attend cette connexion, s'il y en a une. */
export function proposalOf(proposals: readonly Proposal[], connectionId: string): Proposal | undefined {
  return proposals.find((proposal) => membersOf(proposal).some((member) => member.connectionId === connectionId));
}

/** La proposition où attend ce joueur, quelle que soit la connexion. */
export function proposalOfPlayer(proposals: readonly Proposal[], playerId: string): Proposal | undefined {
  return proposals.find((proposal) => membersOf(proposal).some((member) => member.playerId === playerId));
}

export function isSettled(proposal: Proposal): boolean {
  return membersOf(proposal).every((member) => proposal.accepted.includes(member.connectionId));
}

/**
 * Enregistre une acceptation. Rend la proposition mise à jour, ou `undefined` si cette
 * connexion n'est pas membre de la proposition désignée — un message en retard, ou forgé.
 */
export function accept(
  proposals: readonly Proposal[],
  proposalId: string,
  connectionId: string,
): { readonly proposals: readonly Proposal[]; readonly proposal: Proposal | undefined } {
  const found = proposals.find((proposal) => proposal.id === proposalId);
  if (found === undefined || !membersOf(found).some((member) => member.connectionId === connectionId)) {
    return { proposals, proposal: undefined };
  }
  const updated = found.accepted.includes(connectionId) ? found : { ...found, accepted: [...found.accepted, connectionId] };
  return { proposals: proposals.map((proposal) => (proposal.id === found.id ? updated : proposal)), proposal: updated };
}

/** Retire une proposition réglée (acceptée des deux côtés) : la partie va être créée. */
export function settle(proposals: readonly Proposal[], proposalId: string): readonly Proposal[] {
  return proposals.filter((proposal) => proposal.id !== proposalId);
}

/** Une connexion refuse, ou disparaît : sa proposition tombe. */
export function withdraw(
  proposals: readonly Proposal[],
  connectionId: string,
): { readonly proposals: readonly Proposal[]; readonly lapse: Lapse | undefined } {
  const found = proposalOf(proposals, connectionId);
  if (found === undefined) return { proposals, lapse: undefined };
  return { proposals: settle(proposals, found.id), lapse: lapseOf(found, (member) => member.connectionId === connectionId) };
}

/** Les propositions dont le délai est passé tombent ; qui n'avait pas accepté en sort. */
export function expire(proposals: readonly Proposal[], now: number): { readonly proposals: readonly Proposal[]; readonly lapses: readonly Lapse[] } {
  const due = proposals.filter((proposal) => proposal.deadline <= now);
  return {
    proposals: proposals.filter((proposal) => proposal.deadline > now),
    lapses: due.map((proposal) => lapseOf(proposal, (member) => !proposal.accepted.includes(member.connectionId))),
  };
}

/** L'échéance la plus proche, pour l'alarme du Durable Object. */
export function nextDeadline(proposals: readonly Proposal[]): number | undefined {
  return proposals.length === 0 ? undefined : Math.min(...proposals.map((proposal) => proposal.deadline));
}

function lapseOf(proposal: Proposal, faulty: (member: Waiting) => boolean): Lapse {
  const members = membersOf(proposal);
  return {
    proposal,
    requeue: members.filter((member) => !faulty(member) && proposal.accepted.includes(member.connectionId)),
    dropped: members.filter((member) => faulty(member) || !proposal.accepted.includes(member.connectionId)),
  };
}
