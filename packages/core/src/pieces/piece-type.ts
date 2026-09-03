import type { Board } from "../board.js";
import { type Coord, type CoordKey, areAdjacent, chebyshevDistance } from "../coord.js";
import { collectVisible, hasLineOfSight } from "../los.js";
import { type MoveOption, canMeleeReach, reachableTiles } from "../movement.js";
import type { MovementProfile, VisionProfile } from "./profiles.js";
import type { PieceKind } from "./piece.js";

/**
 * Un type de pièce = une classe.
 *
 * La classe de base encode les règles communes à toute pièce — déplacement au sol,
 * vision par raycast, frappe en mêlée — et les expose comme autant de points de
 * redéfinition. Une pièce future qui verrait autrement (relais de vue, téléporteur —
 * docs/design.md points ouverts 8 et 9) redéfinit `canSee` sans qu'aucun appelant ne
 * change : `fog.ts` demande son champ de vision à la pièce, il ne le calcule plus
 * lui-même à partir d'une portée brute.
 *
 * Une instance par type de pièce et par ruleset, jamais une par pièce en jeu : les
 * pièces sur le plateau sont des données inertes (`Piece`), les règles sont ici.
 *
 * Les sous-classes concrètes vivent une par fichier dans `roster/`.
 */
export abstract class PieceType {
  abstract readonly kind: PieceKind;
  /** Portée de déplacement et topologie, fixées par la classe. */
  abstract readonly movement: MovementProfile;
  /** Portée de vision, fixée par la classe. */
  abstract readonly vision: VisionProfile;

  /**
   * Pièce maîtresse à protéger : sa capture met fin à la partie. Aucune spécificité
   * de mouvement pour l'instant (docs/design.md section 7).
   */
  get isCommander(): boolean {
    return false;
  }

  /**
   * Cases atteignables en un tour depuis `from`, sa propre case exclue.
   * `occupied` porte les cases tenues par une pièce : elles bloquent le passage.
   */
  destinationsFrom(
    board: Board,
    from: Coord,
    occupied: ReadonlySet<CoordKey> = new Set(),
  ): Map<CoordKey, MoveOption> {
    return reachableTiles(board, from, this.movement, occupied);
  }

  /**
   * Voit-elle `to` depuis `from` ? Portée horizontale d'abord, occultation ensuite.
   * La hauteur n'étend ni ne réduit la portée, elle ne joue que sur l'occultation
   * (docs/design.md section 5.3).
   */
  canSee(board: Board, from: Coord, to: Coord): boolean {
    return this.visionRangeCovers(from, to) && hasLineOfSight(board, from, to);
  }

  /** Champ de vision complet depuis `from`, dérivé de `canSee`. */
  fieldOfView(board: Board, from: Coord): Set<CoordKey> {
    return collectVisible(board, from, (to) => this.canSee(board, from, to));
  }

  /**
   * Peut-elle frapper `to` depuis `from` ? Adjacence propre à la pièce, puis règle
   * de dénivelé de la mêlée (docs/design.md section 5.3).
   */
  canStrike(board: Board, from: Coord, to: Coord): boolean {
    return areAdjacent(from, to, this.movement.adjacency) && canMeleeReach(board, from, to);
  }

  /** Isolé pour qu'une redéfinition de `canSee` puisse réutiliser la seule portée. */
  protected visionRangeCovers(from: Coord, to: Coord): boolean {
    return chebyshevDistance(from, to) <= this.vision.range;
  }
}
