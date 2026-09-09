import { type Coord, type CoordKey, coordKey } from "./coord.js";
import { type Piece, type PieceId, opponentOf } from "./pieces/index.js";
import { type Result, err, ok } from "./result.js";
import { type GameState, occupancy, piecesOf } from "./state.js";

/**
 * Une action = le tour complet d'une seule pièce (docs/design.md section 6).
 *
 * Une pièce ne fait que se déplacer : la capture de mêlée est retirée le temps de
 * reconstruire la géométrie du jeu (docs/design.md section 3.1). Une case tenue par
 * une pièce, alliée ou adverse, est simplement inatteignable.
 */
export type Action =
  | { readonly kind: "move"; readonly pieceId: PieceId; readonly to: Coord }
  | { readonly kind: "resign" };

export type MoveAction = Extract<Action, { readonly kind: "move" }>;

export type ActionError =
  | { readonly code: "game-over" }
  | { readonly code: "unknown-piece"; readonly pieceId: PieceId }
  | { readonly code: "not-your-piece"; readonly pieceId: PieceId }
  | { readonly code: "unreachable"; readonly to: Coord };

/**
 * Cases occupées vues par une pièce donnée : les siennes exclues, puisqu'elle les
 * libère en partant. Calculé une fois par lot d'appels et non par pièce, la
 * génération des coups légaux le demandant pour chaque pièce du camp au trait.
 */
function occupancyWithout(occupied: ReadonlySet<CoordKey>, piece: Piece): Set<CoordKey> {
  const without = new Set(occupied);
  without.delete(coordKey(piece.coord));
  return without;
}

/**
 * Destinations légales d'une pièce.
 *
 * Sa case de départ n'en fait pas partie : rester sur place n'est plus un coup depuis
 * qu'il n'y a plus rien à y faire. C'est `reachableTiles` qui interdit d'entrer sur une
 * case occupée ou de la traverser, sans distinction de camp.
 */
function destinationsFor(
  state: GameState,
  piece: Piece,
  occupied: ReadonlySet<CoordKey>,
): Map<CoordKey, Coord> {
  const reachable = state.ruleset
    .typeOf(piece)
    .destinationsFrom(state.board, piece.coord, occupancyWithout(occupied, piece));

  const destinations = new Map<CoordKey, Coord>();
  for (const option of reachable.values()) {
    destinations.set(coordKey(option.coord), option.coord);
  }
  return destinations;
}

export function legalActions(state: GameState): Action[] {
  if (state.outcome !== null) return [];

  const occupied = occupancy(state);
  const actions: Action[] = [];

  for (const piece of piecesOf(state, state.activePlayer)) {
    for (const to of destinationsFor(state, piece, occupied).values()) {
      actions.push({ kind: "move", pieceId: piece.id, to });
    }
  }
  return actions;
}

export function validateAction(state: GameState, action: Action): Result<Action, ActionError> {
  if (state.outcome !== null) return err({ code: "game-over" });
  if (action.kind === "resign") return ok(action);

  const piece = state.pieces.get(action.pieceId);
  if (piece === undefined) return err({ code: "unknown-piece", pieceId: action.pieceId });
  if (piece.owner !== state.activePlayer) {
    return err({ code: "not-your-piece", pieceId: action.pieceId });
  }
  if (!destinationsFor(state, piece, occupancy(state)).has(coordKey(action.to))) {
    return err({ code: "unreachable", to: action.to });
  }
  return ok(action);
}

export function applyAction(state: GameState, action: Action): Result<GameState, ActionError> {
  const validation = validateAction(state, action);
  if (!validation.ok) return validation;

  const record = { player: state.activePlayer, action };

  if (action.kind === "resign") {
    return ok({
      ...state,
      outcome: { kind: "victory", winner: opponentOf(state.activePlayer), reason: "resignation" },
      history: [...state.history, record],
    });
  }

  const piece = state.pieces.get(action.pieceId);
  if (piece === undefined) return err({ code: "unknown-piece", pieceId: action.pieceId });

  const pieces = new Map(state.pieces);
  pieces.set(piece.id, { ...piece, coord: action.to });

  return ok({
    ...state,
    pieces,
    activePlayer: opponentOf(state.activePlayer),
    turn: state.turn + 1,
    history: [...state.history, record],
  });
}

export type ReplayError = ActionError & { readonly seq: number };

/**
 * Reconstruit une position en rejouant un log depuis l'état de départ.
 *
 * Ne fonctionne que parce que `core` est strictement déterministe — aucun
 * `Math.random`, aucun `Date.now` (voir CLAUDE.md). Un log rejeté signale un log
 * corrompu ou un ruleset qui ne correspond pas à celui de la partie, jamais un
 * aléa : `seq` désigne le coup fautif.
 */
export function replay(initial: GameState, log: readonly Action[]): Result<GameState, ReplayError> {
  let state = initial;
  for (const [seq, action] of log.entries()) {
    const result = applyAction(state, action);
    if (!result.ok) return err({ ...result.error, seq });
    state = result.value;
  }
  return ok(state);
}
