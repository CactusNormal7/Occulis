import type { Board } from "./board.js";
import { type Coord, type CoordKey, coordKey, neighbors } from "./coord.js";
import type { MovementProfile } from "./piece.js";

export type MoveKind = "walk" | "climb";

export interface MoveOption {
  readonly coord: Coord;
  /** Pas horizontaux consommés. Grimper consomme la totalité du budget. */
  readonly cost: number;
  readonly kind: MoveKind;
}

/**
 * Règles de verticalité (docs/design.md section 5.3) :
 *  - descendre est libre et sans limite de dénivelé ; seul le pas horizontal coûte ;
 *  - monter d'un niveau coûte un déplacement complet et exige d'être déjà collé au
 *    relief au début du tour — c'est donc l'unique action du tour, jamais enchaînable
 *    après des pas horizontaux (cf. l'exemple du mur de hauteur 3 gravi en 3 tours) ;
 *  - un dénivelé de 2 niveaux ou plus en un pas est infranchissable.
 *
 * `occupied` porte les cases tenues par une pièce : elles bloquent le passage.
 */
export function reachableTiles(
  board: Board,
  from: Coord,
  profile: MovementProfile,
  occupied: ReadonlySet<CoordKey> = new Set(),
): Map<CoordKey, MoveOption> {
  const options = new Map<CoordKey, MoveOption>();
  const originHeight = board.heightAt(from);
  if (originHeight === undefined) return options;

  const visited = new Set<CoordKey>([coordKey(from)]);
  let frontier: Coord[] = [from];

  for (let cost = 1; cost <= profile.steps && frontier.length > 0; cost++) {
    const next: Coord[] = [];
    for (const current of frontier) {
      const currentHeight = board.heightAt(current);
      if (currentHeight === undefined) continue;

      for (const candidate of neighbors(current, profile.adjacency)) {
        const key = coordKey(candidate);
        if (visited.has(key) || occupied.has(key)) continue;

        const tile = board.getTile(candidate);
        if (tile === undefined || !tile.passable) continue;
        if (tile.height > currentHeight) continue;

        visited.add(key);
        options.set(key, { coord: candidate, cost, kind: "walk" });
        next.push(candidate);
      }
    }
    frontier = next;
  }

  if (profile.canClimb) {
    for (const candidate of neighbors(from, profile.adjacency)) {
      const key = coordKey(candidate);
      if (visited.has(key) || occupied.has(key)) continue;

      const tile = board.getTile(candidate);
      if (tile === undefined || !tile.passable) continue;
      if (tile.height !== originHeight + 1) continue;

      options.set(key, { coord: candidate, cost: profile.steps, kind: "climb" });
    }
  }

  return options;
}

/**
 * Atteignabilité en mêlée entre deux cases adjacentes (docs/design.md section 5.3).
 * L'asymétrie de la verticalité s'applique : on frappe librement vers le bas, d'un
 * seul niveau vers le haut. Ne teste pas l'adjacence elle-même.
 */
export function canMeleeReach(board: Board, from: Coord, to: Coord): boolean {
  const fromHeight = board.heightAt(from);
  const toHeight = board.heightAt(to);
  if (fromHeight === undefined || toHeight === undefined) return false;
  return toHeight - fromHeight <= 1;
}
