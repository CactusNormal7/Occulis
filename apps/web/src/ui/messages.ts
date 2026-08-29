import type { ActionError, Coord, GameState, Piece, PlayerId } from "@occulis/core";
import type { CommandFault } from "./command.js";

/**
 * Textes de l'interface, regroupés hors du câblage DOM : le module qui écoute les
 * événements ne contient aucune phrase, et les formulations restent relisables
 * d'un seul coup d'œil.
 */

export function formatCoord(coord: Coord): string {
  return `(${coord.x},${coord.y})`;
}

export function describeFault(fault: CommandFault): string {
  switch (fault.code) {
    case "empty":
      return "Saisie vide.";
    case "bad-coord":
      return `Coordonnée illisible : « ${fault.token} ». Format attendu : x,y`;
    case "missing-destination":
      return "Destination manquante. Exemple : 1,6 2,5";
    case "missing-target":
      return "Cible de capture manquante après « x ».";
    case "trailing":
      return `Fin de commande inattendue : « ${fault.token} »`;
    case "no-piece-here":
      return `Aucune pièce en ${formatCoord(fault.coord)}.`;
    case "no-target-here":
      return `Aucune pièce à capturer en ${formatCoord(fault.coord)}.`;
  }
}

export function describeActionError(error: ActionError): string {
  switch (error.code) {
    case "game-over":
      return "La partie est terminée.";
    case "unknown-piece":
      return "Pièce inconnue.";
    case "not-your-piece":
      return "Cette pièce n'est pas au trait.";
    case "unreachable":
      return `${formatCoord(error.to)} est hors de portée de cette pièce ce tour-ci.`;
    case "must-do-something":
      return "Un tour doit déplacer la pièce ou capturer : rester sur place sans frapper n'est pas un coup.";
    case "unknown-target":
      return "Cible inconnue.";
    case "target-is-friendly":
      return "On ne capture pas une pièce de son propre camp.";
    case "target-out-of-melee":
      return "Cible hors de portée de mêlée depuis cette case.";
  }
}

export function describeMove(piece: Piece, to: Coord, captured: Piece | undefined): string {
  const move = `${piece.owner} · ${piece.id} ${formatCoord(piece.coord)} → ${formatCoord(to)}`;
  return captured === undefined ? move : `${move}, capture de ${captured.id}`;
}

export function describeOutcome(outcome: NonNullable<GameState["outcome"]>): string {
  if (outcome.kind === "draw") return "Partie nulle : pat, plus aucun coup légal.";
  const reason = outcome.reason === "resignation" ? "abandon" : "pièce maîtresse capturée";
  return `Victoire de ${outcome.winner} (${reason}).`;
}

export function describeTurn(turn: number, activePlayer: PlayerId, viewer: PlayerId): string {
  return `Tour ${turn} · au trait : ${activePlayer} · vue du joueur ${viewer}`;
}
