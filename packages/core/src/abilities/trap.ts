import type { Board } from "../board.js";
import { type Coord, type CoordKey, coordEquals, coordKey, neighbors } from "../coord.js";
import type { Piece, PieceId, PlayerId } from "../pieces/index.js";

/**
 * Le piège (docs/design/rules.md section 4, décisions du 2026-11-20).
 *
 * - **Pose** : à la place de se déplacer, une pièce dont le type a la capacité `trap`
 *   pose un piège sur une case voisine (huit directions), franchissable, libre, pas plus
 *   haute que la sienne, et qui ne porte pas déjà un piège de son camp.
 * - **Un seul actif par poseur** : tant que son piège n'a pas servi, la pièce n'en pose
 *   pas d'autre. Le piège survit à son poseur s'il est pris.
 * - **Déclenchement** : une pièce adverse qui **termine** son déplacement sur la case est
 *   prise, et le piège disparaît. Le roi aussi : la partie est alors gagnée. Une pièce
 *   du camp du poseur s'y tient sans rien déclencher.
 * - **Invisible** pour l'adversaire jusqu'à son déclenchement (`fog.ts` ne transmet que
 *   les pièges du destinataire).
 *
 * Aucune légalité ne dépend d'un piège adverse : la liste des coups trahirait sa case.
 * Une pièce peut donc entrer sur un piège caché, et l'échec ne le compte pas comme une
 * menace. Pour la même raison, poser sur une case qui porte déjà un piège adverse est
 * permis : les deux coexistent, chacun ne frappant que l'autre camp.
 */
export interface Trap {
  readonly owner: PlayerId;
  /** La pièce qui l'a posé : c'est elle qui n'en pose pas d'autre tant qu'il tient. */
  readonly layer: PieceId;
  readonly coord: Coord;
}

/** La pièce `piece` a-t-elle déjà un piège en jeu ? */
export function hasActiveTrap(traps: readonly Trap[], piece: Piece): boolean {
  return traps.some((trap) => trap.layer === piece.id);
}

/**
 * Les cases où `piece` peut poser son piège. `occupied` porte toutes les cases tenues
 * par une pièce : une case voisine est toujours dans la ligne de vue de la pièce, donc
 * l'en exclure ne trahit aucune pièce cachée.
 */
export function trapTargets(
  board: Board,
  traps: readonly Trap[],
  piece: Piece,
  occupied: ReadonlySet<CoordKey>,
): Coord[] {
  if (hasActiveTrap(traps, piece)) return [];
  const height = board.heightAt(piece.coord) ?? 0;
  return neighbors(piece.coord, "octile").filter(
    (coord) =>
      board.isPassable(coord) &&
      (board.heightAt(coord) ?? 0) <= height &&
      !occupied.has(coordKey(coord)) &&
      !traps.some((trap) => trap.owner === piece.owner && coordEquals(trap.coord, coord)),
  );
}

/** Le piège adverse qui attend une pièce de `mover` sur la case `coord`, s'il y en a un. */
export function trapSprungBy(
  traps: readonly Trap[],
  mover: PlayerId,
  coord: Coord,
): Trap | undefined {
  return traps.find((trap) => trap.owner !== mover && coordEquals(trap.coord, coord));
}
