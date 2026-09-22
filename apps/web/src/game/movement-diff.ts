import { type Coord, type PieceId, type PlayerView, coordEquals } from "@occulis/core";

/** Un déplacement lu entre deux vues successives. */
export interface Movement {
  readonly pieceId: PieceId;
  readonly from: Coord;
  readonly to: Coord;
}

/**
 * Le déplacement décrit par deux vues successives, s'il y en a un.
 *
 * C'est ce qui remplace l'anticipation locale : le client n'applique plus les coups,
 * donc il lit ce qui a bougé dans ce que le serveur lui envoie. Effet recherché — les
 * coups de l'adversaire s'animent au même titre que les siens, alors qu'ils
 * apparaissaient d'un coup.
 *
 * Seules les pièces **présentes dans les deux vues** sont comparées. Sous fog, une
 * pièce qui entre ou sort de la ligne de vue n'a pas bougé pour autant : l'animer
 * dessinerait un trajet qui n'a pas eu lieu, et trahirait au passage une position que
 * le joueur n'est pas censé connaître.
 *
 * Les fantômes sont ignorés : ce sont des souvenirs, pas des observations.
 */
export function movementBetween(before: PlayerView, after: PlayerView): Movement | undefined {
  const previous = new Map<PieceId, Coord>();
  for (const piece of [...before.ownPieces, ...before.visibleEnemies]) {
    previous.set(piece.id, piece.coord);
  }

  for (const piece of [...after.ownPieces, ...after.visibleEnemies]) {
    const from = previous.get(piece.id);
    if (from === undefined || coordEquals(from, piece.coord)) continue;
    return { pieceId: piece.id, from, to: piece.coord };
  }
  return undefined;
}
