import type { Board } from "./board.js";
import { type Coord, type CoordKey, coordKey, neighbors } from "./coord.js";
import type { MovementProfile } from "./pieces/profiles.js";

export type MoveKind = "walk" | "climb";

export interface MoveOption {
  readonly coord: Coord;
  /** Pas horizontaux consommés. Grimper consomme la totalité du budget. */
  readonly cost: number;
  readonly kind: MoveKind;
  /** Vrai quand la case est tenue par une pièce que ce déplacement prend en y arrivant. */
  readonly capture: boolean;
}

/**
 * Règles de verticalité (docs/design.md section 5.3) :
 *  - descendre est libre et sans limite de dénivelé ; seul le pas horizontal coûte ;
 *  - monter d'un niveau coûte un déplacement complet et exige d'être déjà collé au
 *    relief au début du tour — c'est donc l'unique action du tour, jamais enchaînable
 *    après des pas horizontaux (cf. l'exemple du mur de hauteur 3 gravi en 3 tours) ;
 *  - monter de 2 niveaux ou plus en un pas est impossible (descendre, lui, reste libre).
 *
 * `occupied` porte les cases tenues par une pièce : elles bloquent le passage.
 *
 * `capturable` désigne, parmi elles, celles où le déplacement peut **s'achever** : la
 * prise est un déplacement (docs/design/rules.md 3.1), elle suit donc exactement ces
 * règles de hauteur. On s'y arrête — une pièce prise ne se traverse pas dans le même
 * coup.
 */
export function reachableTiles(
  board: Board,
  from: Coord,
  profile: MovementProfile,
  occupied: ReadonlySet<CoordKey> = new Set(),
  capturable: ReadonlySet<CoordKey> = new Set(),
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
        if (visited.has(key)) continue;
        const capture = capturable.has(key);
        if (occupied.has(key) && !capture) continue;

        const tile = board.getTile(candidate);
        if (tile === undefined || !tile.passable) continue;
        if (tile.height > currentHeight) continue;

        visited.add(key);
        options.set(key, { coord: candidate, cost, kind: "walk", capture });
        if (!capture) next.push(candidate);
      }
    }
    frontier = next;
  }

  if (profile.canClimb) {
    for (const candidate of neighbors(from, profile.adjacency)) {
      const key = coordKey(candidate);
      if (visited.has(key)) continue;
      const capture = capturable.has(key);
      if (occupied.has(key) && !capture) continue;

      const tile = board.getTile(candidate);
      if (tile === undefined || !tile.passable) continue;
      if (tile.height !== originHeight + 1) continue;

      options.set(key, { coord: candidate, cost: profile.steps, kind: "climb", capture });
    }
  }

  return options;
}
