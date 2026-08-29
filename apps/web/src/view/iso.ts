import type { Board, Coord } from "@occulis/core";

/**
 * Projection isométrique et géométrie des cases.
 *
 * La rotation du plateau est un recalcul de projection appliqué aux coordonnées
 * logiques (docs/design.md section 8) : rien n'est jamais pivoté au niveau du
 * rendu, ce qui garde le dessin procédural net à tout angle.
 */

export const QUARTER_TURN = Math.PI / 2;

export interface IsoProjection {
  readonly tileWidth: number;
  readonly tileHeight: number;
  /** Décalage vertical à l'écran d'un niveau de hauteur. */
  readonly heightUnit: number;
  /** Facteur de zoom. Il vit dans la projection et non dans la transformation du
   *  conteneur, pour que l'épaisseur des traits reste constante à l'écran. */
  readonly scale: number;
  /** Angle de rotation du plateau, en radians. */
  readonly rotation: number;
  /** Centre de rotation, en coordonnées logiques. */
  readonly pivot: Coord;
}

export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

/** Quadrilatère projeté, sommets dans l'ordre du parcours de la case. */
export type Quad = readonly [ScreenPoint, ScreenPoint, ScreenPoint, ScreenPoint];

/**
 * Coins d'une case en coordonnées logiques fractionnaires, dans le sens du
 * parcours. L'arête `i` relie les coins `i` et `i + 1`.
 */
const CORNERS: readonly Coord[] = [
  { x: -0.5, y: -0.5 },
  { x: 0.5, y: -0.5 },
  { x: 0.5, y: 0.5 },
  { x: -0.5, y: 0.5 },
];

/** Voisin situé de l'autre côté de chaque arête, dans l'ordre de `CORNERS`. */
const EDGE_NEIGHBOURS: readonly Coord[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

/** Rotation d'un point logique autour du pivot, avant projection. */
function rotate(x: number, y: number, proj: IsoProjection): ScreenPoint {
  const cos = Math.cos(proj.rotation);
  const sin = Math.sin(proj.rotation);
  const dx = x - proj.pivot.x;
  const dy = y - proj.pivot.y;
  return {
    x: dx * cos - dy * sin + proj.pivot.x,
    y: dx * sin + dy * cos + proj.pivot.y,
  };
}

function projectXY(x: number, y: number, height: number, proj: IsoProjection): ScreenPoint {
  const r = rotate(x, y, proj);
  return {
    x: (r.x - r.y) * ((proj.tileWidth * proj.scale) / 2),
    y: (r.x + r.y) * ((proj.tileHeight * proj.scale) / 2) - height * proj.heightUnit * proj.scale,
  };
}

/** Centre projeté d'une case, sommet du relief. */
export function project(coord: Coord, height: number, proj: IsoProjection): ScreenPoint {
  return projectXY(coord.x, coord.y, height, proj);
}

/**
 * Face supérieure d'une case. Les quatre coins sont projetés individuellement,
 * au lieu d'un losange à décalages fixes : le pavage reste donc jointif à
 * n'importe quel angle, la grille étant l'image affine d'un quadrillage carré.
 */
export function tileQuad(coord: Coord, height: number, proj: IsoProjection): Quad {
  const [nw, ne, se, sw] = CORNERS;
  if (nw === undefined || ne === undefined || se === undefined || sw === undefined) {
    throw new Error("CORNERS doit comporter quatre coins");
  }
  return [
    projectXY(coord.x + nw.x, coord.y + nw.y, height, proj),
    projectXY(coord.x + ne.x, coord.y + ne.y, height, proj),
    projectXY(coord.x + se.x, coord.y + se.y, height, proj),
    projectXY(coord.x + sw.x, coord.y + sw.y, height, proj),
  ];
}

/**
 * Faces verticales d'une case, une par arête dont le voisin est plus bas ou
 * hors-carte. Seules les vraies ruptures de relief sont dessinées : deux cases
 * de même hauteur ne produisent aucune arête interne, ce qui donne au filaire
 * une silhouette nette au lieu d'un maillage.
 */
export function cliffQuads(
  board: Board,
  coord: Coord,
  height: number,
  proj: IsoProjection,
): Quad[] {
  const top = tileQuad(coord, height, proj);
  const quads: Quad[] = [];

  for (let edge = 0; edge < EDGE_NEIGHBOURS.length; edge += 1) {
    const offset = EDGE_NEIGHBOURS[edge];
    const a = top[edge];
    const b = top[(edge + 1) % top.length];
    if (offset === undefined || a === undefined || b === undefined) continue;

    // Hors-carte : la falaise descend jusqu'au niveau du sol.
    const below = board.heightAt({ x: coord.x + offset.x, y: coord.y + offset.y }) ?? 0;
    if (below >= height) continue;

    const drop = (height - below) * proj.heightUnit * proj.scale;
    quads.push([a, b, { x: b.x, y: b.y + drop }, { x: a.x, y: a.y + drop }]);
  }

  return quads;
}

/**
 * Clé de tri du peintre. `plane` est la profondeur dans le plan du damier ; à
 * profondeur égale, les cases basses se dessinent avant les hautes pour que les
 * falaises recouvrent correctement leur voisinage.
 */
export interface Depth {
  readonly plane: number;
  readonly height: number;
}

export function depthOf(coord: Coord, height: number, proj: IsoProjection): Depth {
  const r = rotate(coord.x, coord.y, proj);
  return { plane: r.x + r.y, height };
}

/** Ordonne du plus lointain au plus proche de la caméra. */
export function compareDepth(a: Depth, b: Depth): number {
  return a.plane - b.plane || a.height - b.height;
}

/** Interpolation d'angle par le plus court chemin, pour une rotation continue. */
export function lerpAngle(from: number, to: number, t: number): number {
  const tau = Math.PI * 2;
  const delta = ((((to - from) % tau) + tau + Math.PI) % tau) - Math.PI;
  return from + delta * t;
}

/** Quart de tour le plus proche, pour l'aimantation de la rotation libre. */
export function snapAngle(angle: number): number {
  return Math.round(angle / QUARTER_TURN) * QUARTER_TURN;
}

/** Aplatit un quadrilatère au format attendu par `Graphics.poly`. */
export function flattenQuad(quad: Quad): number[] {
  return quad.flatMap((point) => [point.x, point.y]);
}
