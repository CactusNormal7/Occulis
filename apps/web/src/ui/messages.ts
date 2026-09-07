import type { ActionError, Coord, GameState, Piece, PlayerId, Tile } from "@occulis/core";
import type { Rejection, RoomFault } from "@occulis/protocol";
import type { CommandFault } from "./command.js";
import type { Seeking } from "./flow.js";

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
    case "leaves-commander-exposed":
      return "Coup interdit : il laisserait votre pièce maîtresse en prise.";
  }
}

/**
 * Un refus venu du serveur : soit les règles (`ActionError`), soit le siège. Toute
 * partie étant arbitrée, les deux cas sont possibles à tout moment.
 */
export function describeRejection(rejection: Rejection): string {
  switch (rejection.code) {
    case "unknown-seat":
      return "Siège inconnu : cette connexion n'appartient à aucun des deux camps.";
    case "not-your-turn":
      return `Ce n'est pas votre tour : ${rejection.activePlayer} est au trait.`;
    default:
      return describeActionError(rejection);
  }
}

/** Pourquoi un code de salon n'a mené à aucune partie. */
export function describeRoomFault(fault: RoomFault): string {
  switch (fault.code) {
    case "unknown":
      return "Aucune partie sous ce code : vérifiez la saisie, ou faites-le renvoyer.";
    case "own":
      return "C'est votre propre code : transmettez-le à votre adversaire.";
  }
}

/** Ce que le joueur attend, et depuis quel menu. */
export function describeWaiting(seeking: Seeking, code: string | undefined): string {
  if (seeking === "quick") return "Recherche d'un adversaire…";
  if (seeking === "join") return "Entrée dans la partie…";
  return code === undefined
    ? "Ouverture de la partie…"
    : "Transmettez ce code à votre adversaire, puis attendez son arrivée.";
}

export function describeMove(piece: Piece, to: Coord, captured: Piece | undefined): string {
  const move = `${piece.owner} · ${piece.id} ${formatCoord(piece.coord)} → ${formatCoord(to)}`;
  return captured === undefined ? move : `${move}, capture de ${captured.id}`;
}

const VICTORY_REASONS: Record<
  Extract<NonNullable<GameState["outcome"]>, { kind: "victory" }>["reason"],
  string
> = {
  resignation: "abandon",
  checkmate: "mat",
  "commander-captured": "pièce maîtresse capturée",
};

const DRAW_REASONS: Record<
  Extract<NonNullable<GameState["outcome"]>, { kind: "draw" }>["reason"],
  string
> = {
  stalemate: "pat, plus aucun coup légal",
  repetition: "même position atteinte trois fois",
  "no-capture": "trop de coups sans la moindre capture",
};

export function describeOutcome(outcome: NonNullable<GameState["outcome"]>): string {
  if (outcome.kind === "draw") return `Partie nulle : ${DRAW_REASONS[outcome.reason]}.`;
  return `Victoire de ${outcome.winner} (${VICTORY_REASONS[outcome.reason]}).`;
}

/**
 * L'état du tour. Le camp du joueur y figure toujours, et non le point de vue
 * affiché : il n'y en a qu'un — le serveur n'envoie jamais la vue d'en face.
 */
export function describeTurn(
  turn: number,
  activePlayer: PlayerId,
  seat: PlayerId,
  check = false,
): string {
  const whose = activePlayer === seat ? "à vous de jouer" : "au trait : l'adversaire";
  const line = `Tour ${turn} · ${whose} · vous jouez ${seat}`;
  return check ? `${line} · ÉCHEC` : line;
}

/**
 * Lecture d'une case désignée au clic, sous la forme exacte attendue par la
 * saisie de coups — de quoi recopier la coordonnée dans le champ.
 *
 * Ne rapporte que du terrain : le relief est public (implementation-notes #10),
 * alors qu'annoncer la pièce présente divulguerait une position hors LOS.
 */
export function describeTile(tile: Tile | undefined): string {
  if (tile === undefined) return "Hors plateau.";
  const relief = `${tile.coord.x},${tile.coord.y} · hauteur ${tile.height}`;
  return tile.passable ? relief : `${relief} · infranchissable`;
}
