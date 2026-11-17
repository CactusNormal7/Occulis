import { type Coord, type CoordKey, coordKey } from "./coord.js";
import { type Piece, type PieceId, type PlayerId, opponentOf } from "./pieces/index.js";
import { leavesKingExposed, outcomeOf, project, tickDrawClock } from "./endgame.js";
import { type Result, err, ok } from "./result.js";
import { type GameState, occupancy, piecesOf } from "./state.js";

/**
 * Une action = le tour complet d'une seule pièce (docs/design/rules.md section 6).
 *
 * Un déplacement n'a pas de champ « prise » : sous un ruleset qui la permet, une pièce
 * prend en **arrivant sur la case** d'une pièce adverse (rules.md 3.1), et c'est la
 * position qui le dit. Le joueur ne déclare donc rien — et la liste de ses coups ne
 * trahit pas si une case qu'il ne voit pas est occupée. Sous les rulesets d'avant, une
 * case tenue par une pièce, alliée ou adverse, reste inatteignable.
 *
 * L'abandon, lui, se joue à tout moment, au trait ou non : sans quoi un joueur qui quitte
 * la partie pendant le tour d'en face la laisserait ouverte à jamais. `player` dit qui
 * abandonne ; absent — tous les logs d'avant —, c'est le joueur au trait.
 */
export type Action =
  | { readonly kind: "move"; readonly pieceId: PieceId; readonly to: Coord }
  | { readonly kind: "resign"; readonly player?: PlayerId | undefined };

export type MoveAction = Extract<Action, { readonly kind: "move" }>;

export type ActionError =
  | { readonly code: "game-over" }
  | { readonly code: "unknown-piece"; readonly pieceId: PieceId }
  | { readonly code: "not-your-piece"; readonly pieceId: PieceId }
  | { readonly code: "unreachable"; readonly to: Coord }
  /** Le coup laisserait son propre roi prenable — menace visible ou non (rules.md 7.1). */
  | { readonly code: "leaves-king-exposed" };

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

/** Les cases tenues par l'adversaire de `piece`, si le ruleset permet de les prendre. */
function capturableBy(state: GameState, piece: Piece): Set<CoordKey> {
  const targets = new Set<CoordKey>();
  if (!state.ruleset.rules.capture) return targets;
  for (const other of state.pieces.values()) {
    if (other.owner !== piece.owner) targets.add(coordKey(other.coord));
  }
  return targets;
}

/**
 * Les cases où une pièce peut se rendre, **sans** regarder ce que le coup fait à son roi :
 * les cases libres atteignables, et les cases adverses où elle prend.
 *
 * Sa case de départ n'en fait pas partie : on ne passe pas son tour (rules.md section 3).
 * C'est le type de la pièce qui répond (`destinationsFrom`, `capturesFrom`) ; rien n'est
 * recalculé ici à partir d'une portée.
 */
function destinationsFor(
  state: GameState,
  piece: Piece,
  occupied: ReadonlySet<CoordKey>,
): Map<CoordKey, Coord> {
  const type = state.ruleset.typeOf(piece);
  const others = occupancyWithout(occupied, piece);

  const destinations = new Map<CoordKey, Coord>();
  for (const option of type.destinationsFrom(state.board, piece.coord, others).values()) {
    destinations.set(coordKey(option.coord), option.coord);
  }
  const targets = capturableBy(state, piece);
  for (const option of type.capturesFrom(state.board, piece.coord, others, targets).values()) {
    destinations.set(coordKey(option.coord), option.coord);
  }
  return destinations;
}

/**
 * Un coup qui laisse son propre roi prenable est illégal, comme aux échecs — y compris
 * quand la menace est hors de la ligne de vue de son auteur. C'est la règle qui donne
 * son sens au mat : sans elle, un joueur mat pourrait toujours jouer et se faire prendre.
 */
function isForbidden(state: GameState, pieceId: PieceId, to: Coord): boolean {
  return state.ruleset.rules.check && leavesKingExposed(state, { pieceId, to });
}

export function legalActions(state: GameState): Action[] {
  if (state.outcome !== null) return [];

  const occupied = occupancy(state);
  const actions: Action[] = [];

  for (const piece of piecesOf(state, state.activePlayer)) {
    for (const to of destinationsFor(state, piece, occupied).values()) {
      if (isForbidden(state, piece.id, to)) continue;
      actions.push({ kind: "move", pieceId: piece.id, to });
    }
  }
  return actions;
}

/** Reste-t-il un coup au joueur au trait ? S'arrête au premier trouvé. */
function hasLegalAction(state: GameState): boolean {
  const occupied = occupancy(state);
  for (const piece of piecesOf(state, state.activePlayer)) {
    for (const to of destinationsFor(state, piece, occupied).values()) {
      if (!isForbidden(state, piece.id, to)) return true;
    }
  }
  return false;
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
  if (isForbidden(state, piece.id, action.to)) return err({ code: "leaves-king-exposed" });
  return ok(action);
}

export function applyAction(state: GameState, action: Action): Result<GameState, ActionError> {
  const validation = validateAction(state, action);
  if (!validation.ok) return validation;

  if (action.kind === "resign") {
    const resigning = action.player ?? state.activePlayer;
    return ok({
      ...state,
      outcome: { kind: "victory", winner: opponentOf(resigning), reason: "resignation" },
      history: [...state.history, { player: resigning, action }],
    });
  }

  const { pieces, captured } = project(state.pieces, action);
  const moved: GameState = {
    ...state,
    pieces,
    activePlayer: opponentOf(state.activePlayer),
    turn: state.turn + 1,
    history: [...state.history, { player: state.activePlayer, action, captured }],
  };
  const played = { ...moved, draw: tickDrawClock(state.draw, moved, captured !== undefined) };
  return ok({ ...played, outcome: outcomeOf(played, () => hasLegalAction(played)) });
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
