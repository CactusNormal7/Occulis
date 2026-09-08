import { type Coord, type CoordKey, coordEquals, coordKey } from "./coord.js";
import { type Piece, type PieceId, type PlayerId, opponentOf } from "./pieces/index.js";
import { type Result, err, ok } from "./result.js";
import {
  type DrawClock,
  type GameState,
  commanderOf,
  occupancy,
  piecesOf,
  positionKey,
} from "./state.js";

/**
 * Seuils des nulles anti-blocage (docs/design.md section 7.2).
 *
 * `REPETITION_LIMIT` reprend la triple répétition des échecs.
 * `ACTIONS_WITHOUT_CAPTURE_LIMIT` compte des **actions**, pas des rondes : 60 actions
 * valent 30 tours par camp. La valeur est un point de départ raisonné, pas un
 * équilibrage — aucun roster n'est acté (docs/implementation-notes #17).
 */
export const REPETITION_LIMIT = 3;
export const ACTIONS_WITHOUT_CAPTURE_LIMIT = 60;

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

export type MoveAction = Extract<Action, { readonly kind: "move" }>;

export type ActionError =
  | { readonly code: "game-over" }
  | { readonly code: "unknown-piece"; readonly pieceId: PieceId }
  | { readonly code: "not-your-piece"; readonly pieceId: PieceId }
  | { readonly code: "unreachable"; readonly to: Coord }
  | { readonly code: "must-do-something" }
  | { readonly code: "unknown-target"; readonly targetId: PieceId }
  | { readonly code: "target-is-friendly"; readonly targetId: PieceId }
  | { readonly code: "target-out-of-melee"; readonly targetId: PieceId }
  | { readonly code: "leaves-commander-exposed" };

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

/** Destinations légales d'une pièce, sa case de départ incluse (frapper sur place). */
function destinationsFor(
  state: GameState,
  piece: Piece,
  occupied: ReadonlySet<CoordKey>,
): Map<CoordKey, Coord> {
  const reachable = state.ruleset
    .typeOf(piece)
    .destinationsFrom(state.board, piece.coord, occupancyWithout(occupied, piece));

  const destinations = new Map<CoordKey, Coord>([[coordKey(piece.coord), piece.coord]]);
  for (const option of reachable.values()) {
    destinations.set(coordKey(option.coord), option.coord);
  }
  return destinations;
}

/** Adversaires capturables depuis `from` par `piece` — la portée est celle du type. */
function capturablesFrom(state: GameState, piece: Piece, from: Coord): Piece[] {
  const type = state.ruleset.typeOf(piece);
  return piecesOf(state, opponentOf(piece.owner)).filter((target) =>
    type.canStrike(state.board, from, target.coord),
  );
}

export function legalActions(state: GameState): Action[] {
  if (state.outcome !== null) return [];

  const occupied = occupancy(state);
  const actions: Action[] = [];

  for (const piece of piecesOf(state, state.activePlayer)) {
    for (const to of destinationsFor(state, piece, occupied).values()) {
      const stayingPut = coordEquals(to, piece.coord);
      if (!stayingPut) actions.push({ kind: "move", pieceId: piece.id, to });
      for (const target of capturablesFrom(state, piece, to)) {
        actions.push({ kind: "move", pieceId: piece.id, to, capture: target.id });
      }
    }
  }
  return actions.filter((action) => !leavesCommanderExposed(state, action));
}

/**
 * Un coup qui laisse sa propre pièce maîtresse capturable est illégal, comme aux
 * échecs — y compris quand la menace est hors de la ligne de vue de son auteur
 * (docs/design.md section 7, décision « échecs strict »). C'est la règle qui donne
 * son sens au mat : sans elle, un joueur mat pourrait toujours jouer et se faire
 * simplement capturer.
 */
export function validateAction(state: GameState, action: Action): Result<Action, ActionError> {
  const validated = validateShape(state, action);
  if (!validated.ok) return validated;

  const candidate = validated.value;
  if (candidate.kind === "move" && leavesCommanderExposed(state, candidate)) {
    return err({ code: "leaves-commander-exposed" });
  }
  return validated;
}

function validateShape(state: GameState, action: Action): Result<Action, ActionError> {
  if (state.outcome !== null) return err({ code: "game-over" });
  if (action.kind === "resign") return ok(action);

  const piece = state.pieces.get(action.pieceId);
  if (piece === undefined) return err({ code: "unknown-piece", pieceId: action.pieceId });
  if (piece.owner !== state.activePlayer) {
    return err({ code: "not-your-piece", pieceId: action.pieceId });
  }

  const stayingPut = coordEquals(action.to, piece.coord);
  if (!stayingPut && !destinationsFor(state, piece, occupancy(state)).has(coordKey(action.to))) {
    return err({ code: "unreachable", to: action.to });
  }
  if (stayingPut && action.capture === undefined) return err({ code: "must-do-something" });
  if (action.capture === undefined) return ok(action);

  return validateCapture(state, piece, action.to, action.capture);
}

/** `origin` est la case d'où la pièce frappe, c'est-à-dire sa destination. */
function validateCapture(
  state: GameState,
  piece: Piece,
  origin: Coord,
  targetId: PieceId,
): Result<Action, ActionError> {
  const target = state.pieces.get(targetId);
  if (target === undefined) return err({ code: "unknown-target", targetId });
  if (target.owner === piece.owner) return err({ code: "target-is-friendly", targetId });
  if (!capturablesFrom(state, piece, origin).some((candidate) => candidate.id === target.id)) {
    return err({ code: "target-out-of-melee", targetId });
  }
  return ok({ kind: "move", pieceId: piece.id, to: origin, capture: targetId });
}

/**
 * Effets matériels d'un coup, sans validation ni fin de partie.
 *
 * Séparé de `applyAction` parce que tester la légalité d'un coup exige de regarder
 * la position qu'il produit : passer par `applyAction` rappellerait `legalActions`
 * et bouclerait sans fin. Le trait ne change pas — cette position est une
 * hypothèse, pas un tour joué.
 */
function project(state: GameState, action: MoveAction): GameState {
  const piece = state.pieces.get(action.pieceId);
  if (piece === undefined) return state;

  const pieces = new Map(state.pieces);
  if (action.capture !== undefined) pieces.delete(action.capture);
  pieces.set(piece.id, { ...piece, coord: action.to });
  return { ...state, pieces };
}

function leavesCommanderExposed(state: GameState, action: Action): boolean {
  if (action.kind === "resign") return false;
  return isCommanderThreatened(project(state, action), state.activePlayer);
}

/** Fait avancer l'horloge de nulle. La position comptée est celle *après* le coup. */
function tickDrawClock(previous: DrawClock, next: GameState, captured: boolean): DrawClock {
  const key = positionKey(next);
  const seen = new Map(previous.seen);
  seen.set(key, (seen.get(key) ?? 0) + 1);
  return { seen, sinceCapture: captured ? 0 : previous.sinceCapture + 1 };
}

function withOutcome(state: GameState): GameState {
  if (state.outcome !== null) return state;

  for (const player of ["A", "B"] as const) {
    if (commanderOf(state, player) === undefined) {
      const outcome = {
        kind: "victory",
        winner: opponentOf(player),
        reason: "commander-captured",
      } as const;
      return { ...state, outcome };
    }
  }

  // Plus aucune parade : mat si la pièce maîtresse est menacée, pat sinon. C'est
  // la seule chose qui distingue les deux (docs/design.md sections 1 et 7).
  if (legalActions(state).length === 0) {
    const outcome = isCommanderThreatened(state, state.activePlayer)
      ? ({ kind: "victory", winner: opponentOf(state.activePlayer), reason: "checkmate" } as const)
      : ({ kind: "draw", reason: "stalemate" } as const);
    return { ...state, outcome };
  }

  // Testées après le mat : un mat reste un mat, même atteint au coup qui déclenche
  // une nulle anti-blocage.
  if ((state.draw.seen.get(positionKey(state)) ?? 0) >= REPETITION_LIMIT) {
    return { ...state, outcome: { kind: "draw", reason: "repetition" } };
  }
  if (state.draw.sinceCapture >= ACTIONS_WITHOUT_CAPTURE_LIMIT) {
    return { ...state, outcome: { kind: "draw", reason: "no-capture" } };
  }
  return state;
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

  const played: GameState = {
    ...project(state, action),
    activePlayer: opponentOf(state.activePlayer),
    turn: state.turn + 1,
    history: [...state.history, record],
  };
  return ok(
    withOutcome({
      ...played,
      draw: tickDrawClock(state.draw, played, action.capture !== undefined),
    }),
  );
}

/** Vrai si la pièce maîtresse de `player` est capturable par l'adversaire au trait suivant. */
export function isCommanderThreatened(state: GameState, player: PlayerId): boolean {
  const commander = commanderOf(state, player);
  if (commander === undefined) return false;

  const occupied = occupancy(state);
  for (const enemy of piecesOf(state, opponentOf(player))) {
    for (const from of destinationsFor(state, enemy, occupied).values()) {
      if (capturablesFrom(state, enemy, from).some((target) => target.id === commander.id)) {
        return true;
      }
    }
  }
  return false;
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
