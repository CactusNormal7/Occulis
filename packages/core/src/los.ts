import type { Board } from "./board.js";
import { type Coord, type CoordKey, chebyshevDistance, coordKey } from "./coord.js";

/**
 * Hauteur du "regard" au-dessus de la case sur laquelle se tient l'observateur.
 * Une pièce sur une case de hauteur h regarde depuis h + EYE_HEIGHT ; un mur de
 * hauteur h occupe l'espace jusqu'à h. L'occultation est donc testée avec `>=` :
 * un mur exactement à hauteur du regard bloque (raser le sommet ne laisse pas voir).
 * Cf. docs/design.md section 5.2 — "une tour ne peut pas voir derrière un mur".
 */
const EYE_HEIGHT = 1;

/**
 * Volume qu'une pièce ajoute à sa case pour l'occultation (docs/design.md section 5.2).
 *
 * Une pièce bloque la vue comme le ferait un mur d'un niveau posé sur sa case : deux
 * pièces au même niveau se masquent donc mutuellement ce qui est derrière elles, mais
 * un observateur perché voit par-dessus une pièce restée en contrebas. Même valeur que
 * `EYE_HEIGHT` et pour la même raison — une pièce occupe exactement la hauteur d'où
 * elle regarde.
 */
const PIECE_HEIGHT = 1;

const NO_PIECES: ReadonlySet<CoordKey> = new Set();

/** Cases traversées par le segment [from, to], extrémités incluses (Bresenham). */
export function rasterizeLine(from: Coord, to: Coord): Coord[] {
  const points: Coord[] = [];
  let x = from.x;
  let y = from.y;
  const dx = Math.abs(to.x - x);
  const dy = -Math.abs(to.y - y);
  const sx = x < to.x ? 1 : -1;
  const sy = y < to.y ? 1 : -1;
  let err = dx + dy;

  for (;;) {
    points.push({ x, y });
    if (x === to.x && y === to.y) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
  return points;
}

/**
 * Le tracé de Bresenham départage les diagonales selon le sens de parcours : tracer
 * A→B et B→A ne traverse pas toujours les mêmes cases. Laisser cette asymétrie
 * remonter jusqu'à la LOS donnerait des situations où A voit B sans que B ne voie A
 * — inacceptable en 1v1 à information cachée. On fixe donc un sens canonique.
 */
function inCanonicalOrder(a: Coord, b: Coord): readonly [Coord, Coord] {
  if (a.x !== b.x) return a.x < b.x ? [a, b] : [b, a];
  return a.y <= b.y ? [a, b] : [b, a];
}

/**
 * Ligne de vue entre deux cases : raycast 2D avec comparaison de la hauteur de
 * chaque obstacle traversé à la hauteur interpolée de la ligne de visée.
 * Cf. docs/design.md section 5.1 — pas de moteur 3D.
 *
 * `occupied` porte les cases tenues par une pièce : elles occultent comme un relief
 * plus haut de `PIECE_HEIGHT`, sans distinction de camp — la LOS resterait sinon
 * asymétrique entre les deux joueurs.
 *
 * Symétrique par construction. Les deux cases d'extrémité n'occultent jamais leur
 * propre ligne de vue — une pièce ne s'aveugle pas elle-même et n'empêche pas qu'on
 * la voie — et une case hors-carte traversée n'occulte pas non plus : c'est un vide,
 * pas un obstacle.
 */
export function hasLineOfSight(
  board: Board,
  from: Coord,
  to: Coord,
  occupied: ReadonlySet<CoordKey> = NO_PIECES,
): boolean {
  const [start, end] = inCanonicalOrder(from, to);
  const fromTile = board.getTile(start);
  const toTile = board.getTile(end);
  if (!fromTile || !toTile) return false;

  const path = rasterizeLine(start, end);
  const lastStep = path.length - 1;
  if (lastStep <= 1) return true;

  const eyeFrom = fromTile.height + EYE_HEIGHT;
  const eyeTo = toTile.height + EYE_HEIGHT;

  for (let i = 1; i < lastStep; i++) {
    const coord = path[i];
    if (coord === undefined) continue;
    const tileHeight = board.heightAt(coord);
    if (tileHeight === undefined) continue;

    const obstacleHeight =
      tileHeight + (occupied.has(coordKey(coord)) ? PIECE_HEIGHT : 0);
    const sightlineHeight = eyeFrom + ((eyeTo - eyeFrom) * i) / lastStep;
    if (obstacleHeight >= sightlineHeight) return false;
  }
  return true;
}

/**
 * Cases visibles depuis un point, filtrées par le test fourni par l'appelant.
 *
 * Ce module ne connaît que la géométrie : ce qu'une pièce voit réellement est
 * défini par son type (`PieceType.canSee` / `fieldOfView`), qui passe ici son
 * propre critère. Une pièce à la vision particulière n'a donc rien à réécrire du
 * raycast.
 */
export function collectVisible(
  board: Board,
  origin: Coord,
  canSee: (target: Coord) => boolean,
): Set<CoordKey> {
  const visible = new Set<CoordKey>();
  if (!board.contains(origin)) return visible;

  for (const tile of board.allTiles()) {
    if (canSee(tile.coord)) visible.add(coordKey(tile.coord));
  }
  return visible;
}

/**
 * Champ de vision purement géométrique : portée de Chebyshev horizontale et
 * occultation par le relief comme par les pièces. La hauteur n'étend ni ne réduit
 * la portée, elle ne joue que sur l'occultation (docs/design.md section 5.3).
 */
export function visibleFrom(
  board: Board,
  origin: Coord,
  range = Number.POSITIVE_INFINITY,
  occupied: ReadonlySet<CoordKey> = NO_PIECES,
): Set<CoordKey> {
  return collectVisible(
    board,
    origin,
    (target) =>
      chebyshevDistance(origin, target) <= range && hasLineOfSight(board, origin, target, occupied),
  );
}
