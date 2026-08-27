import type { Board } from "./board.js";
import { type Coord, type CoordKey, coordKey } from "./coord.js";
import { visibleFrom } from "./los.js";
import type { Piece, PieceId, PieceKind, PlayerId } from "./piece.js";
import { type GameState, piecesOf } from "./state.js";

/** Dernière position connue d'une pièce adverse, à afficher en fantôme estompé. */
export interface RememberedPiece {
  readonly id: PieceId;
  readonly kind: PieceKind;
  readonly owner: PlayerId;
  readonly coord: Coord;
  readonly lastSeenTurn: number;
}

export interface PlayerKnowledge {
  readonly player: PlayerId;
  readonly visible: ReadonlySet<CoordKey>;
  readonly remembered: ReadonlyMap<PieceId, RememberedPiece>;
}

export function emptyKnowledge(player: PlayerId): PlayerKnowledge {
  return { player, visible: new Set(), remembered: new Map() };
}

/** Union des champs de vision des pièces d'un joueur. */
export function visibleTilesFor(board: Board, state: GameState, player: PlayerId): Set<CoordKey> {
  const visible = new Set<CoordKey>();
  for (const piece of piecesOf(state, player)) {
    const { range } = state.ruleset.get(piece.kind).vision;
    for (const key of visibleFrom(board, piece.coord, range)) visible.add(key);
  }
  return visible;
}

/**
 * Fait avancer la mémoire d'un joueur (docs/design.md section 5.4).
 *
 * Une pièce adverse vue est mémorisée à sa position courante. Un souvenir n'est
 * effacé que lorsqu'il est *contredit* : si la case mémorisée redevient visible et
 * que la pièce n'y est plus, le fantôme disparaît — sinon il persiste, puisque le
 * joueur n'a aucun moyen de savoir qu'elle a bougé.
 */
export function observe(previous: PlayerKnowledge, state: GameState): PlayerKnowledge {
  const player = previous.player;
  const visible = visibleTilesFor(state.board, state, player);
  const remembered = new Map(previous.remembered);

  for (const [id, ghost] of remembered) {
    if (visible.has(coordKey(ghost.coord))) remembered.delete(id);
  }

  for (const piece of state.pieces.values()) {
    if (piece.owner === player) continue;
    if (!visible.has(coordKey(piece.coord))) continue;
    remembered.set(piece.id, {
      id: piece.id,
      kind: piece.kind,
      owner: piece.owner,
      coord: piece.coord,
      lastSeenTurn: state.turn,
    });
  }

  return { player, visible, remembered };
}

/**
 * État transmissible à un joueur : ses propres pièces, les adverses réellement dans
 * sa LOS, et les fantômes hors LOS. Tout le reste est absent — pas masqué à
 * l'affichage. Le fog of war doit être appliqué à la source, sinon il est
 * contournable via les devtools (docs/design.md section 5.4).
 */
export interface PlayerView {
  readonly player: PlayerId;
  readonly activePlayer: PlayerId;
  readonly turn: number;
  readonly outcome: GameState["outcome"];
  readonly visible: ReadonlySet<CoordKey>;
  readonly ownPieces: readonly Piece[];
  readonly visibleEnemies: readonly Piece[];
  /** Fantômes : pièces mémorisées mais actuellement hors LOS. */
  readonly ghosts: readonly RememberedPiece[];
}

export function viewFor(state: GameState, knowledge: PlayerKnowledge): PlayerView {
  const player = knowledge.player;
  const ownPieces: Piece[] = [];
  const visibleEnemies: Piece[] = [];

  for (const piece of state.pieces.values()) {
    if (piece.owner === player) {
      ownPieces.push(piece);
    } else if (knowledge.visible.has(coordKey(piece.coord))) {
      visibleEnemies.push(piece);
    }
  }

  const seenNow = new Set(visibleEnemies.map((piece) => piece.id));
  const ghosts = [...knowledge.remembered.values()].filter((ghost) => !seenNow.has(ghost.id));

  return {
    player,
    activePlayer: state.activePlayer,
    turn: state.turn,
    outcome: state.outcome,
    visible: knowledge.visible,
    ownPieces,
    visibleEnemies,
    ghosts,
  };
}
