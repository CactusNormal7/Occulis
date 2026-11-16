import { type Coord, type CoordKey, coordEquals, coordKey } from "./coord.js";
import { type Piece, type PieceId, type PlayerId, opponentOf } from "./pieces/index.js";
import {
  type DrawClock,
  type GameState,
  type Outcome,
  commanderOf,
  piecesOf,
  positionKey,
} from "./state.js";

/**
 * La fin de partie : la prise, l'échec, le mat, le pat et les nulles anti-blocage
 * (docs/design/rules.md 3.1, 7.1 et 7.2).
 *
 * Rien ici ne connaît un type de pièce en particulier. La seule question posée à une
 * pièce est « menaces-tu cette case ? » (`PieceType.threatens`) : une pièce nouvelle,
 * quelle que soit sa façon de prendre, entre dans le calcul du mat sans que ce module
 * change.
 *
 * `actions.ts` s'appuie sur ce module, jamais l'inverse : `concludeIfOver` reçoit de lui
 * la seule chose qu'il ne peut pas savoir sans boucler, à savoir s'il reste un coup légal.
 */

/** Un déplacement réduit à ses effets matériels : quelle pièce, vers quelle case. */
export interface Displacement {
  readonly pieceId: PieceId;
  readonly to: Coord;
}

export interface Projection {
  readonly pieces: ReadonlyMap<PieceId, Piece>;
  /** La pièce adverse qui tenait la case d'arrivée, et qui tombe. */
  readonly captured: Piece | undefined;
}

/**
 * Les pièces après un déplacement, sans validation, sans changer le trait.
 *
 * Séparé de `applyAction` parce que juger la légalité d'un coup exige de regarder la
 * position qu'il produit : passer par `applyAction` rappellerait `legalActions` et
 * bouclerait sans fin.
 */
export function project(pieces: ReadonlyMap<PieceId, Piece>, move: Displacement): Projection {
  const piece = pieces.get(move.pieceId);
  if (piece === undefined) return { pieces, captured: undefined };

  const next = new Map(pieces);
  let captured: Piece | undefined;
  for (const other of pieces.values()) {
    if (other.id !== piece.id && coordEquals(other.coord, move.to)) captured = other;
  }
  if (captured !== undefined) next.delete(captured.id);
  next.set(piece.id, { ...piece, coord: move.to });
  return { pieces: next, captured };
}

/**
 * Le roi de `player` peut-il être pris au prochain coup adverse ?
 *
 * Calculé sur la position **réelle** : une menace hors de la ligne de vue compte comme
 * les autres (rules.md 7.1, « échecs strict »). Un camp sans roi n'est jamais en échec —
 * c'est le cas des cartes de test, et rien d'autre.
 */
export function isKingThreatened(state: GameState, player: PlayerId): boolean {
  const king = commanderOf(state, player);
  if (king === undefined) return false;

  const occupied = new Set<CoordKey>();
  for (const piece of state.pieces.values()) occupied.add(coordKey(piece.coord));

  for (const enemy of piecesOf(state, opponentOf(player))) {
    // Une pièce ne se barre pas la route à elle-même : sa case sort de l'occupation.
    const others = new Set(occupied);
    others.delete(coordKey(enemy.coord));
    if (state.ruleset.typeOf(enemy).threatens(state.board, enemy.coord, king.coord, others)) {
      return true;
    }
  }
  return false;
}

/** Ce déplacement laisserait-il le roi de celui qui le joue prenable ? */
export function leavesKingExposed(state: GameState, move: Displacement): boolean {
  const mover = state.pieces.get(move.pieceId);
  if (mover === undefined) return false;
  return isKingThreatened({ ...state, pieces: project(state.pieces, move).pieces }, mover.owner);
}

/** Fait avancer l'horloge des nulles. La position comptée est celle d'**après** le coup. */
export function tickDrawClock(previous: DrawClock, next: GameState, captured: boolean): DrawClock {
  const key = positionKey(next.pieces.values(), next.activePlayer);
  // Une prise est irréversible : aucune position d'avant ne peut revenir. Repartir
  // d'une table vide borne aussi sa taille.
  const seen = new Map(captured ? [] : previous.seen);
  seen.set(key, (seen.get(key) ?? 0) + 1);
  return { seen, sinceCapture: captured ? 0 : previous.sinceCapture + 1 };
}

/**
 * L'issue de la position, si elle en a une. `hasLegalMove` dit si le joueur au trait
 * peut encore jouer ; il n'est consulté que sous la règle d'échec.
 *
 * Le mat est testé avant les nulles : un mat reste un mat, même atteint au coup qui
 * aurait déclenché une nulle anti-blocage.
 */
export function outcomeOf(state: GameState, hasLegalMove: () => boolean): Outcome | null {
  if (state.outcome !== null) return state.outcome;
  const { check, draws } = state.ruleset.rules;

  if (check && !hasLegalMove()) {
    return isKingThreatened(state, state.activePlayer)
      ? { kind: "victory", winner: opponentOf(state.activePlayer), reason: "checkmate" }
      : { kind: "draw", reason: "stalemate" };
  }

  if (draws !== null) {
    const occurrences = state.draw.seen.get(positionKey(state.pieces.values(), state.activePlayer));
    if ((occurrences ?? 0) >= draws.repetition) return { kind: "draw", reason: "repetition" };
    if (state.draw.sinceCapture >= draws.withoutCapture) {
      return { kind: "draw", reason: "no-capture" };
    }
  }
  return null;
}
