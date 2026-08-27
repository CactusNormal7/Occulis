import { type Coord, type CoordKey, areAdjacent, coordEquals, coordKey } from "./coord.js";
import { canMeleeReach, reachableTiles } from "./movement.js";
import { type Piece, type PieceId, type PlayerId, opponentOf } from "./piece.js";
import { type Result, err, ok } from "./result.js";
import { type GameState, commanderOf, occupancy, piecesOf } from "./state.js";

/**
 * Une action = le tour complet d'une seule pièce (docs/design.md section 6).
 *
 * La capture de mêlée est instantanée et résolue dans la même action que le
 * déplacement qui l'a permise, comme aux échecs (section 3.1). Elle est déclarée
 * explicitement plutôt que déduite du seul contact : `to` peut valoir la case de
 * départ, ce qui exprime « frapper un adverse adjacent sans bouger ».
 */
export type Action =
  | {
      readonly kind: "move";
      readonly pieceId: PieceId;
      readonly to: Coord;
      readonly capture?: PieceId | undefined;
    }
  | { readonly kind: "resign" };

export type ActionError =
  | { readonly code: "game-over" }
  | { readonly code: "unknown-piece"; readonly pieceId: PieceId }
  | { readonly code: "not-your-piece"; readonly pieceId: PieceId }
  | { readonly code: "unreachable"; readonly to: Coord }
  | { readonly code: "must-do-something" }
  | { readonly code: "unknown-target"; readonly targetId: PieceId }
  | { readonly code: "target-is-friendly"; readonly targetId: PieceId }
  | { readonly code: "target-out-of-melee"; readonly targetId: PieceId };

/** Destinations légales d'une pièce, sa case de départ incluse (frapper sur place). */
function destinationsFor(state: GameState, piece: Piece): Map<CoordKey, Coord> {
  const profile = state.ruleset.get(piece.kind).movement;
  const occupied = occupancy(state);
  occupied.delete(coordKey(piece.coord));

  const destinations = new Map<CoordKey, Coord>([[coordKey(piece.coord), piece.coord]]);
  for (const option of reachableTiles(state.board, piece.coord, profile, occupied).values()) {
    destinations.set(coordKey(option.coord), option.coord);
  }
  return destinations;
}

/** Adversaires capturables depuis `from` par `piece` (adjacence + règle de dénivelé). */
function capturablesFrom(state: GameState, piece: Piece, from: Coord): Piece[] {
  const { adjacency } = state.ruleset.get(piece.kind).movement;
  return piecesOf(state, opponentOf(piece.owner)).filter(
    (target) =>
      areAdjacent(from, target.coord, adjacency) && canMeleeReach(state.board, from, target.coord),
  );
}

export function legalActions(state: GameState): Action[] {
  if (state.outcome !== null) return [];

  const actions: Action[] = [];
  for (const piece of piecesOf(state, state.activePlayer)) {
    for (const to of destinationsFor(state, piece).values()) {
      const stayingPut = coordEquals(to, piece.coord);
      if (!stayingPut) actions.push({ kind: "move", pieceId: piece.id, to });
      for (const target of capturablesFrom(state, piece, to)) {
        actions.push({ kind: "move", pieceId: piece.id, to, capture: target.id });
      }
    }
  }
  return actions;
}

export function validateAction(state: GameState, action: Action): Result<Action, ActionError> {
  if (state.outcome !== null) return err({ code: "game-over" });
  if (action.kind === "resign") return ok(action);

  const piece = state.pieces.get(action.pieceId);
  if (piece === undefined) return err({ code: "unknown-piece", pieceId: action.pieceId });
  if (piece.owner !== state.activePlayer) return err({ code: "not-your-piece", pieceId: action.pieceId });

  const stayingPut = coordEquals(action.to, piece.coord);
  if (!stayingPut && !destinationsFor(state, piece).has(coordKey(action.to))) {
    return err({ code: "unreachable", to: action.to });
  }
  if (stayingPut && action.capture === undefined) return err({ code: "must-do-something" });

  if (action.capture !== undefined) {
    const target = state.pieces.get(action.capture);
    if (target === undefined) return err({ code: "unknown-target", targetId: action.capture });
    if (target.owner === piece.owner) return err({ code: "target-is-friendly", targetId: action.capture });
    if (!capturablesFrom(state, piece, action.to).some((c) => c.id === target.id)) {
      return err({ code: "target-out-of-melee", targetId: action.capture });
    }
  }
  return ok(action);
}

function withOutcome(state: GameState): GameState {
  if (state.outcome !== null) return state;
  for (const player of ["A", "B"] as const) {
    if (commanderOf(state, player) === undefined) {
      return { ...state, outcome: { kind: "victory", winner: opponentOf(player), reason: "commander-captured" } };
    }
  }
  if (legalActions(state).length === 0) {
    return { ...state, outcome: { kind: "draw", reason: "stalemate" } };
  }
  return state;
}

export function applyAction(state: GameState, action: Action): Result<GameState, ActionError> {
  const validation = validateAction(state, action);
  if (!validation.ok) return validation;

  if (action.kind === "resign") {
    return ok({
      ...state,
      outcome: { kind: "victory", winner: opponentOf(state.activePlayer), reason: "resignation" },
    });
  }

  const piece = state.pieces.get(action.pieceId);
  if (piece === undefined) return err({ code: "unknown-piece", pieceId: action.pieceId });

  const pieces = new Map(state.pieces);
  if (action.capture !== undefined) pieces.delete(action.capture);
  pieces.set(piece.id, { ...piece, coord: action.to });

  return ok(
    withOutcome({
      ...state,
      pieces,
      activePlayer: opponentOf(state.activePlayer),
      turn: state.turn + 1,
    }),
  );
}

/** Vrai si la pièce maîtresse de `player` est capturable par l'adversaire au trait suivant. */
export function isCommanderThreatened(state: GameState, player: PlayerId): boolean {
  const commander = commanderOf(state, player);
  if (commander === undefined) return false;

  for (const enemy of piecesOf(state, opponentOf(player))) {
    for (const from of destinationsFor(state, enemy).values()) {
      if (capturablesFrom(state, enemy, from).some((target) => target.id === commander.id)) return true;
    }
  }
  return false;
}
