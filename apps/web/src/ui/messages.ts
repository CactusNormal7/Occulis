import type { ActionError, Coord, GameState, Piece, PlayerId, Tile } from "@occulis/core";
import type { Rejection, RoomFault } from "@occulis/protocol";
import type { Identity } from "../net/auth.js";
import type { CommandFault } from "./command.js";
import type { Seeking } from "./flow.js";
import { messages } from "../i18n/current.js";

/**
 * Textes de l'interface, regroupés hors du câblage DOM : le module qui écoute les
 * événements ne contient aucune phrase. Les phrases elles-mêmes vivent dans
 * `@occulis/i18n`, dans la langue courante ; ce module choisit laquelle dire.
 */

export function formatCoord(coord: Coord): string {
  return `(${coord.x},${coord.y})`;
}

export function describeFault(fault: CommandFault): string {
  const m = messages().game.fault;
  switch (fault.code) {
    case "empty":
      return m.empty;
    case "bad-coord":
      return m.badCoord(fault.token);
    case "missing-destination":
      return m.missingDestination;
    case "trailing":
      return m.trailing(fault.token);
    case "no-piece-here":
      return m.noPieceHere(formatCoord(fault.coord));
  }
}

export function describeActionError(error: ActionError): string {
  const m = messages().game.actionError;
  switch (error.code) {
    case "game-over":
      return m.gameOver;
    case "unknown-piece":
      return m.unknownPiece;
    case "not-your-piece":
      return m.notYourPiece;
    case "unreachable":
      return m.unreachable(formatCoord(error.to));
  }
}

/**
 * Un refus venu du serveur : soit les règles (`ActionError`), soit le siège. Toute
 * partie étant arbitrée, les deux cas sont possibles à tout moment.
 */
export function describeRejection(rejection: Rejection): string {
  const m = messages().game.rejection;
  switch (rejection.code) {
    case "unknown-seat":
      return m.unknownSeat;
    case "not-your-turn":
      return m.notYourTurn(rejection.activePlayer);
    default:
      return describeActionError(rejection);
  }
}

/** Pourquoi un code de salon n'a mené à aucune partie. */
export function describeRoomFault(fault: RoomFault): string {
  const m = messages().game.roomFault;
  switch (fault.code) {
    case "unknown":
      return m.unknown;
    case "own":
      return m.own;
  }
}

/** Ce que le joueur attend, et depuis quel menu. */
export function describeWaiting(seeking: Seeking, code: string | undefined): string {
  const m = messages().game.waiting;
  if (seeking === "quick") return m.quick;
  if (seeking === "join") return m.join;
  return code === undefined ? m.opening : m.hosting;
}

export function describeMove(piece: Piece, to: Coord): string {
  return `${piece.owner} · ${piece.id} ${formatCoord(piece.coord)} → ${formatCoord(to)}`;
}

export function describeOutcome(outcome: NonNullable<GameState["outcome"]>): string {
  const m = messages().game.outcome;
  return m.victory(outcome.winner, m.reasons[outcome.reason]);
}

/**
 * L'état du tour. Le camp du joueur y figure toujours, et non le point de vue
 * affiché : il n'y en a qu'un — le serveur n'envoie jamais la vue d'en face.
 */
export function describeTurn(turn: number, activePlayer: PlayerId, seat: PlayerId): string {
  const m = messages().game.turn;
  return m.line(turn, activePlayer === seat ? m.yours : m.theirs, seat);
}

/**
 * Lecture d'une case désignée au clic, sous la forme exacte attendue par la
 * saisie de coups — de quoi recopier la coordonnée dans le champ.
 *
 * Ne rapporte que du terrain : le relief est public (implementation-notes #10),
 * alors qu'annoncer la pièce présente divulguerait une position hors LOS.
 */
export function describeTile(tile: Tile | undefined): string {
  const m = messages().game.tile;
  if (tile === undefined) return m.offBoard;
  const relief = m.relief(tile.coord.x, tile.coord.y, tile.height);
  return tile.passable ? relief : `${relief} · ${m.impassable}`;
}

/** Ce que le menu affiche du compte : le pseudo, et l'état de la vérification. */
export function describeIdentity(identity: Identity): string {
  if (!identity.signedIn) return "";
  if (identity.emailVerified === false) {
    // Dit pourquoi le jeu reste fermé : sans ça, les boutons désactivés n'ont
    // aucune explication à l'écran.
    return messages().game.menu.unverified(identity.handle ?? "");
  }
  return identity.handle ?? "";
}
