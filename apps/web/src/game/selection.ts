import {
  type Action,
  type Coord,
  type CoordKey,
  type GameState,
  type Piece,
  coordEquals,
  coordKey,
  pieceAt,
} from "@occulis/core";

/**
 * Sélection d'une pièce et résolution d'un clic. Module pur : ni PixiJS, ni DOM.
 *
 * Rien n'est recalculé ici : les possibilités sont **filtrées depuis la liste de
 * coups légaux fournie par le serveur**, jamais redéduites. Un coup affiché est donc
 * un coup que le serveur acceptera, et aucun coup jouable n'est escamoté.
 */

export interface Selection {
  readonly piece: Piece;
  /** Cases où la pièce peut se rendre, indexées par leur clé. */
  readonly moves: ReadonlyMap<CoordKey, Coord>;
}

export type ClickOutcome =
  | { readonly kind: "select"; readonly selection: Selection }
  | { readonly kind: "play"; readonly action: Action }
  | { readonly kind: "clear" };

/**
 * `legal` est la liste que le serveur a calculée sur la position réelle
 * (`PlayerView.legalActions`), et non ce que le client déduirait de sa vue : sous fog
 * il ignore les menaces cachées et les pièces qui barrent une route, donc il
 * proposerait des coups refusés et en cacherait d'acceptables.
 */
export function selectionFor(legal: readonly Action[], piece: Piece): Selection {
  const moves = new Map<CoordKey, Coord>();

  for (const action of legal) {
    if (action.kind !== "move" || action.pieceId !== piece.id) continue;
    moves.set(coordKey(action.to), action.to);
  }

  return { piece, moves };
}

/**
 * Ce qu'un clic sur `coord` doit produire, compte tenu de la sélection courante.
 * Fonction totale et sans effet : l'appelant applique le résultat.
 */
export function resolveClick(
  legal: readonly Action[],
  state: GameState,
  selection: Selection | undefined,
  coord: Coord | undefined,
): ClickOutcome {
  if (coord === undefined || state.outcome !== null) return { kind: "clear" };

  if (selection !== undefined) {
    // Recliquer la pièce sélectionnée la désélectionne.
    if (coordEquals(coord, selection.piece.coord)) return { kind: "clear" };

    const destination = selection.moves.get(coordKey(coord));
    if (destination !== undefined) {
      return {
        kind: "play",
        action: { kind: "move", pieceId: selection.piece.id, to: destination },
      };
    }
  }

  const piece = pieceAt(state, coord);
  // On ne sélectionne que ses propres pièces, et seulement à son tour.
  if (piece === undefined || piece.owner !== state.activePlayer) return { kind: "clear" };
  return { kind: "select", selection: selectionFor(legal, piece) };
}
