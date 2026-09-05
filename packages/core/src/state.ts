import type { Action } from "./actions.js";
import type { Board } from "./board.js";
import { type Coord, type CoordKey, coordEquals, coordKey } from "./coord.js";
import type { Piece, PieceId, PlayerId, Ruleset } from "./pieces/index.js";

export type Outcome =
  | {
      readonly kind: "victory";
      readonly winner: PlayerId;
      readonly reason: "commander-captured" | "resignation" | "checkmate";
    }
  | {
      readonly kind: "draw";
      /**
       * `stalemate` : le joueur au trait n'a plus aucun coup légal, sa pièce
       * maîtresse hors de danger. Les deux autres sont les règles anti-blocage
       * (docs/design.md section 7.2).
       */
      readonly reason: "stalemate" | "repetition" | "no-capture";
    };

export interface GameState {
  readonly board: Board;
  readonly ruleset: Ruleset;
  readonly pieces: ReadonlyMap<PieceId, Piece>;
  readonly activePlayer: PlayerId;
  /** Incrémenté à chaque action ; un tour = une action d'une seule pièce (section 6). */
  readonly turn: number;
  readonly outcome: Outcome | null;
  /**
   * Les coups joués depuis la position de départ, dans l'ordre.
   *
   * C'est ce que le serveur persiste et rejoue : le log d'actions est la source de
   * vérité, l'état n'en est qu'un cache reconstructible (docs/architecture.md
   * section 3). Le tenir dans l'état plutôt qu'à côté garantit qu'il ne peut pas
   * diverger de la position qu'il décrit.
   */
  readonly history: readonly ActionRecord[];
  readonly draw: DrawClock;
}

/**
 * Ce qu'il faut retenir pour les nulles anti-blocage (docs/design.md section 7.2).
 *
 * Tenu de façon incrémentale plutôt que recalculé depuis `history` : la partie est
 * sans limite de temps de réflexion, donc potentiellement longue, et rejouer tout le
 * log à chaque coup serait quadratique pour une information de deux entiers.
 */
export interface DrawClock {
  /** Combien de fois chaque position a déjà été atteinte. */
  readonly seen: ReadonlyMap<PositionKey, number>;
  /** Actions jouées depuis la dernière capture. */
  readonly sinceCapture: number;
}

export type PositionKey = string;

/**
 * Signature d'une position, pour la règle de répétition.
 *
 * Les pièces sont identifiées par leur camp et leur type, **pas par leur
 * identifiant** : deux éclaireurs d'un même camp qui échangent leurs cases rendent
 * bien la même position, comme aux échecs. Le trait en fait partie — la même
 * disposition n'est pas la même position selon qui doit jouer.
 */
export function positionKey(state: GameState): PositionKey {
  const pieces = [...state.pieces.values()]
    .map((piece) => `${piece.owner}${piece.kind}@${piece.coord.x},${piece.coord.y}`)
    .sort()
    .join(";");
  return `${pieces}|${state.activePlayer}`;
}

/** Un coup joué, avec le camp qui l'a joué — que la position seule ne dit plus. */
export interface ActionRecord {
  readonly player: PlayerId;
  readonly action: Action;
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
  const initial: GameState = {
    board,
    ruleset,
    pieces: byId,
    activePlayer: firstPlayer,
    turn: 0,
    outcome: null,
    history: [],
    draw: { seen: new Map(), sinceCapture: 0 },
  };
  // La position de départ compte pour une occurrence : sans elle, y revenir deux fois
  // n'en ferait que deux, et la troisième répétition n'arriverait jamais au bon coup.
  return { ...initial, draw: { seen: new Map([[positionKey(initial), 1]]), sinceCapture: 0 } };
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
