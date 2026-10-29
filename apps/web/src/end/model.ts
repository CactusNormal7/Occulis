import type { Messages } from "@occulis/i18n";
import type { MatchEnd } from "../app/match-controller.js";

/** Ce que la fenêtre de fin dit d'une partie regardée. */
export interface EndTexts {
  readonly won: boolean;
  readonly title: string;
  readonly detail: string;
}

/**
 * Le résultat du point de vue de l'ami suivi, jamais du spectateur. L'abandon est
 * aujourd'hui la seule issue (open-points 13) ; un forfait pour absence en est un, joué
 * par le serveur au nom de l'absent.
 */
export function endTexts(m: Messages["game"]["end"], end: MatchEnd): EndTexts {
  const won = end.outcome.winner === end.side;
  const reason = m[end.outcome.reason];
  return {
    won,
    title: won ? m.friendWon(end.friend) : m.friendLost(end.friend),
    detail: won ? reason.friendWon : reason.friendLost(end.friend),
  };
}
