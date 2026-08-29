import {
  type Action,
  type Coord,
  type CoordKey,
  type GameState,
  type Piece,
  type PieceId,
  coordEquals,
  coordKey,
  legalActions,
  pieceAt,
} from "@occulis/core";

/**
 * Sélection d'une pièce et résolution d'un clic. Module pur : ni PixiJS, ni DOM.
 *
 * Rien n'est recalculé ici de ce que `core` sait déjà : les possibilités sont
 * **filtrées depuis `legalActions`**, jamais redéduites. L'interface ne peut donc
 * pas proposer un coup que `applyAction` refuserait, ni en oublier un.
 */

export interface Selection {
  readonly piece: Piece;
  /** Cases où la pièce peut se rendre, indexées par leur clé. */
  readonly moves: ReadonlyMap<CoordKey, Coord>;
  /** Adversaires frappables sans bouger, indexés par la case qu'ils occupent. */
  readonly strikes: ReadonlyMap<CoordKey, PieceId>;
}

export type ClickOutcome =
  | { readonly kind: "select"; readonly selection: Selection }
  | { readonly kind: "play"; readonly action: Action }
  | { readonly kind: "clear" };

export function selectionFor(state: GameState, piece: Piece): Selection {
  const moves = new Map<CoordKey, Coord>();
  const strikes = new Map<CoordKey, PieceId>();

  for (const action of legalActions(state)) {
    if (action.kind !== "move" || action.pieceId !== piece.id) continue;

    if (action.capture === undefined) {
      moves.set(coordKey(action.to), action.to);
      continue;
    }
    // Seule la frappe sur place est désignable d'un clic : se déplacer *puis*
    // capturer demanderait de choisir deux cases, ce qui n'est pas câblé.
    if (!coordEquals(action.to, piece.coord)) continue;
    const target = state.pieces.get(action.capture);
    if (target !== undefined) strikes.set(coordKey(target.coord), target.id);
  }

  return { piece, moves, strikes };
}

/**
 * Ce qu'un clic sur `coord` doit produire, compte tenu de la sélection courante.
 * Fonction totale et sans effet : l'appelant applique le résultat.
 */
export function resolveClick(
  state: GameState,
  selection: Selection | undefined,
  coord: Coord | undefined,
): ClickOutcome {
  if (coord === undefined || state.outcome !== null) return { kind: "clear" };

  if (selection !== undefined) {
    // Recliquer la pièce sélectionnée la désélectionne.
    if (coordEquals(coord, selection.piece.coord)) return { kind: "clear" };

    const key = coordKey(coord);
    const destination = selection.moves.get(key);
    if (destination !== undefined) {
      return {
        kind: "play",
        action: { kind: "move", pieceId: selection.piece.id, to: destination },
      };
    }

    const target = selection.strikes.get(key);
    if (target !== undefined) {
      return {
        kind: "play",
        action: {
          kind: "move",
          pieceId: selection.piece.id,
          to: selection.piece.coord,
          capture: target,
        },
      };
    }
  }

  const piece = pieceAt(state, coord);
  // On ne sélectionne que ses propres pièces, et seulement à son tour.
  if (piece === undefined || piece.owner !== state.activePlayer) return { kind: "clear" };
  return { kind: "select", selection: selectionFor(state, piece) };
}
