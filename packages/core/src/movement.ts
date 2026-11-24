import type { Board } from "./board.js";
import { type Coord, type CoordKey, coordKey, neighbors } from "./coord.js";
import type { MovementLine, MovementProfile } from "./pieces/profiles.js";

export type MoveKind = "walk" | "climb";

export interface MoveOption {
  readonly coord: Coord;
  /**
   * Pas horizontaux consommés. Grimper consomme la totalité du budget d'une pièce qui
   * marche ; pour une pièce qui glisse, c'est la distance parcourue sur sa ligne.
   */
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
  if (profile.lines !== undefined) {
    return lineReachableTiles(board, from, profile, profile.lines, occupied, capturable);
  }

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

/**
 * Les cases d'une pièce qui glisse en ligne droite, comme aux échecs : dans chaque
 * direction, elle avance case par case jusqu'à sa portée, et s'arrête avant le bord, une
 * case infranchissable, une pièce qu'elle ne peut pas prendre ou une case qui monte. Elle
 * s'arrête **sur** une pièce qu'elle prend. Les règles de hauteur sont celles de
 * `reachableTiles` : descendre est libre, un glissement ne monte jamais, et grimper d'un
 * niveau reste possible sur la première case d'une ligne, comme unique mouvement.
 */
function lineReachableTiles(
  board: Board,
  from: Coord,
  profile: MovementProfile,
  lines: readonly MovementLine[],
  occupied: ReadonlySet<CoordKey>,
  capturable: ReadonlySet<CoordKey>,
): Map<CoordKey, MoveOption> {
  const options = new Map<CoordKey, MoveOption>();
  const originHeight = board.heightAt(from);
  if (originHeight === undefined) return options;

  for (const { direction, reach } of lines) {
    let previousHeight = originHeight;
    for (let distance = 1; distance <= reach; distance++) {
      const candidate = { x: from.x + direction.x * distance, y: from.y + direction.y * distance };
      const key = coordKey(candidate);
      const capture = capturable.has(key);
      if (occupied.has(key) && !capture) break;

      const tile = board.getTile(candidate);
      if (tile === undefined || !tile.passable) break;

      const climbs = distance === 1 && profile.canClimb && tile.height === originHeight + 1;
      if (tile.height > previousHeight && !climbs) break;

      options.set(key, {
        coord: candidate,
        cost: distance,
        kind: climbs ? "climb" : "walk",
        capture,
      });
      if (capture || climbs) break;
      previousHeight = tile.height;
    }
  }

  return options;
}
