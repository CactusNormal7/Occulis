import type { Board } from "../board.js";
import { type Coord, type CoordKey, chebyshevDistance, coordKey } from "../coord.js";
import { blockingPiece, collectVisible, hasLineOfSight } from "../los.js";
import { type MoveOption, reachableTiles } from "../movement.js";
import type { MovementProfile, VisionProfile } from "./profiles.js";
import type { PieceKind } from "./piece.js";

/**
 * La place d'un type dans une équipe : la pièce maîtresse, les pièces à capacité, les
 * pions. C'est sur elle que portent les quotas de composition d'une équipe
 * (`TeamRules`, `team.ts`) — un nouveau type à capacité n'a qu'à se déclarer `special`.
 */
export type PieceRole = "commander" | "special" | "pawn";

/**
 * Un type de pièce = une classe.
 *
 * La classe de base encode les règles communes à toute pièce — déplacement au sol,
 * prise à l'arrivée, vision par raycast — et les expose comme autant de points de
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

  /** `special` par défaut : un type ne se déclare maîtresse ou pion qu'explicitement. */
  get role(): PieceRole {
    return "special";
  }

  /**
   * Le roi, la pièce à protéger : c'est sur lui que portent l'échec et le mat
   * (`endgame.ts`). Aucune spécificité de mouvement pour l'instant
   * (docs/design/rules.md section 7).
   */
  get isCommander(): boolean {
    return this.role === "commander";
  }

  /**
   * Cases **libres** atteignables en un tour depuis `from`, sa propre case exclue.
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
   * Parmi les cases `targets` (tenues par une pièce adverse, donc comprises dans
   * `occupied`), celles où cette pièce peut prendre depuis `from`.
   *
   * Par défaut, la prise est un déplacement qui s'achève sur la case adverse
   * (docs/design/rules.md 3.1) : mêmes pas, même règle de hauteur, aucune pièce
   * traversée. C'est **le** point d'extension d'une pièce qui prendrait autrement
   * qu'elle ne se déplace : l'échec, le mat et les coups légaux ne lisent que lui.
   */
  capturesFrom(
    board: Board,
    from: Coord,
    occupied: ReadonlySet<CoordKey>,
    targets: ReadonlySet<CoordKey>,
  ): Map<CoordKey, MoveOption> {
    const captures = new Map<CoordKey, MoveOption>();
    if (targets.size === 0) return captures;
    for (const [key, option] of reachableTiles(board, from, this.movement, occupied, targets)) {
      if (option.capture) captures.set(key, option);
    }
    return captures;
  }

  /** Menace-t-elle la case `target` depuis `from` ? Dérivé de `capturesFrom`. */
  threatens(board: Board, from: Coord, target: Coord, occupied: ReadonlySet<CoordKey>): boolean {
    const key = coordKey(target);
    return this.capturesFrom(board, from, occupied, new Set([key])).has(key);
  }

  /**
   * Voit-elle `to` depuis `from` ? Portée horizontale d'abord, occultation ensuite.
   * La hauteur n'étend ni ne réduit la portée, elle ne joue que sur l'occultation
   * (docs/design.md section 5.3).
   *
   * `occupied` porte les cases tenues par une pièce : elles coupent la vue au même
   * titre que le relief (docs/design.md section 5.2).
   */
  canSee(
    board: Board,
    from: Coord,
    to: Coord,
    occupied: ReadonlySet<CoordKey> = new Set(),
  ): boolean {
    return this.visionRangeCovers(from, to) && hasLineOfSight(board, from, to, occupied);
  }

  /**
   * Champ de vision complet depuis `from`, dérivé de `canSee` : les cases vues, plus
   * celle de chaque pièce qui coupe un regard dans la portée (`blockingPiece`) — une
   * pièce qui bloque une ligne de vue est visible (docs/design.md section 5.2).
   */
  fieldOfView(
    board: Board,
    from: Coord,
    occupied: ReadonlySet<CoordKey> = new Set(),
  ): Set<CoordKey> {
    const seen = collectVisible(board, from, (to) => this.canSee(board, from, to, occupied));
    for (const tile of board.allTiles()) {
      if (!this.visionRangeCovers(from, tile.coord) || seen.has(coordKey(tile.coord))) continue;
      const blocker = blockingPiece(board, from, tile.coord, occupied);
      if (blocker !== undefined) seen.add(coordKey(blocker));
    }
    return seen;
  }

  /** Isolé pour qu'une redéfinition de `canSee` puisse réutiliser la seule portée. */
  protected visionRangeCovers(from: Coord, to: Coord): boolean {
    return chebyshevDistance(from, to) <= this.vision.range;
  }
}
