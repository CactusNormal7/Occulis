import type { ActionError, Coord, TeamError } from "@occulis/core";
import type { Rejection, RoomFault } from "@occulis/protocol";
import type { Identity } from "../net/auth.js";
import type { Seeking } from "./flow.js";
import { messages } from "../locale/current.js";

/**
 * Textes de l'interface, regroupés hors du câblage DOM : le module qui écoute les
 * événements ne contient aucune phrase. Les phrases elles-mêmes vivent dans
 * `@occulis/i18n`, dans la langue courante ; ce module choisit laquelle dire.
 */

function formatCoord(coord: Coord): string {
  return `(${coord.x},${coord.y})`;
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
    case "leaves-king-exposed":
      return m.leavesKingExposed;
  }
}

/**
 * Un refus venu du serveur : soit les règles (`ActionError`), soit le siège. Toute
 * partie étant arbitrée, les deux cas sont possibles à tout moment.
 */
export function describeRejection(rejection: Rejection): string {
  const m = messages().game.rejection;
  const t = messages().team.errors;
  switch (rejection.code) {
    case "unknown-seat":
      return m.unknownSeat;
    case "not-your-turn":
      return m.notYourTurn(rejection.activePlayer);
    case "wrong-phase":
      return t.wrongPhase;
    case "already-locked":
      return t.alreadyLocked;
    case "malformed-team":
      return t.malformed;
    case "no-team-rules":
    case "unknown-kind":
    case "wrong-count":
    case "outside-zone":
    case "same-tile":
      return describeTeamError(rejection);
    case "game-over":
    case "unknown-piece":
    case "not-your-piece":
    case "unreachable":
    case "leaves-king-exposed":
      return describeActionError(rejection);
  }
}

/** Pourquoi une équipe n'est pas déployable — le refus du serveur comme le verdict du brouillon. */
export function describeTeamError(error: TeamError): string {
  const m = messages().team;
  switch (error.code) {
    case "no-team-rules":
      return m.errors.noTeamRules;
    case "unknown-kind":
      return m.errors.unknownKind(error.kind);
    case "wrong-count":
      return m.errors.wrongCount(m.roles[error.role], error.expected, error.actual);
    case "outside-zone":
      return m.errors.outsideZone(error.coord.x, error.coord.y);
    case "same-tile":
      return m.errors.sameTile(error.coord.x, error.coord.y);
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
    case "unavailable":
      return m.unavailable;
    case "replaced":
      return m.replaced;
  }
}

/** Ce que le joueur attend, et depuis quel menu. */
export function describeWaiting(
  seeking: Seeking,
  code: string | undefined,
  friend?: string,
): string {
  const m = messages().game.waiting;
  if (seeking === "quick") return m.quick;
  if (seeking === "join") return m.join;
  if (seeking === "challenge") return m.challenge(friend ?? m.someone);
  if (seeking === "watch") return m.watch(friend ?? m.someone);
  return code === undefined ? m.opening : m.hosting;
}

/** Ce que le menu affiche du compte : le pseudo, et l'état de la vérification. */
export function describeIdentity(identity: Identity): string {
  if (!identity.signedIn) return "";
  if (identity.emailVerified === false) {
    // Dit pourquoi le jeu reste fermé : sans ça, les boutons désactivés n'ont
    // aucune explication à l'écran.
    return messages().game.menu.unverified(identity.handle ?? "");
  }
  // Le pseudo est déjà affiché par le coin du compte : le répéter sous le titre
  // ne dirait rien de plus.
  return "";
}
