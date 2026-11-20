import type { Messages } from "@occulis/i18n";
import type { MatchEnd } from "../app/match-controller.js";

/** Ce que la fenêtre de fin dit d'une partie regardée. */
export interface EndTexts {
  /** Faux pour une défaite comme pour une nulle. */
  readonly won: boolean;
  readonly title: string;
  readonly detail: string;
}

/**
 * Le résultat du point de vue de l'ami suivi, jamais du spectateur. Un forfait pour
 * absence est un abandon, joué par le serveur au nom de l'absent.
 */
export function endTexts(m: Messages["game"]["end"], end: MatchEnd): EndTexts {
  if (end.outcome.kind === "draw") {
    return { won: false, title: m.friendDrew(end.friend), detail: m.draws[end.outcome.reason] };
  }
  const won = end.outcome.winner === end.side;
  const reason = m[end.outcome.reason];
  return {
    won,
    title: won ? m.friendWon(end.friend) : m.friendLost(end.friend),
    detail: won ? reason.friendWon : reason.friendLost(end.friend),
  };
}
