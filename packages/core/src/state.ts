import type { Board } from "./board.js";
import { type Coord, type CoordKey, coordEquals, coordKey } from "./coord.js";
import type { Piece, PieceId, PlayerId, Ruleset } from "./pieces/index.js";

export type Outcome =
  | {
      readonly kind: "victory";
      readonly winner: PlayerId;
      readonly reason: "commander-captured" | "resignation";
    }
  /** Pat : le joueur au trait n'a plus aucun coup légal (docs/design.md section 7). */
  | { readonly kind: "draw"; readonly reason: "stalemate" };

export interface GameState {
  readonly board: Board;
  readonly ruleset: Ruleset;
  readonly pieces: ReadonlyMap<PieceId, Piece>;
  readonly activePlayer: PlayerId;
  /** Incrémenté à chaque action ; un tour = une action d'une seule pièce (section 6). */
  readonly turn: number;
  readonly outcome: Outcome | null;
}

export function createGame(
  board: Board,
  ruleset: Ruleset,
  pieces: readonly Piece[],
  firstPlayer: PlayerId = "A",
): GameState {
  const byId = new Map<PieceId, Piece>();
  const seenCoords = new Set<CoordKey>();
  for (const piece of pieces) {
    if (byId.has(piece.id)) {
      throw new Error(`createGame: identifiant de pièce dupliqué "${piece.id}"`);
    }
    const key = coordKey(piece.coord);
    if (seenCoords.has(key)) throw new Error(`createGame: deux pièces sur la case ${key}`);
    if (!board.isPassable(piece.coord)) {
      throw new Error(`createGame: pièce "${piece.id}" sur une case infranchissable ${key}`);
    }
    seenCoords.add(key);
    byId.set(piece.id, piece);
  }
  return { board, ruleset, pieces: byId, activePlayer: firstPlayer, turn: 0, outcome: null };
}

export function pieceAt(state: GameState, coord: Coord): Piece | undefined {
  for (const piece of state.pieces.values()) {
    if (coordEquals(piece.coord, coord)) return piece;
  }
  return undefined;
}

export function occupancy(state: GameState): Set<CoordKey> {
  const occupied = new Set<CoordKey>();
  for (const piece of state.pieces.values()) occupied.add(coordKey(piece.coord));
  return occupied;
}

export function piecesOf(state: GameState, player: PlayerId): Piece[] {
  return [...state.pieces.values()].filter((piece) => piece.owner === player);
}

export function commanderOf(state: GameState, player: PlayerId): Piece | undefined {
  return piecesOf(state, player).find((piece) => state.ruleset.typeOf(piece).isCommander);
}
