import type { Coord } from "@occulis/core";

/**
 * Projection isométrique. La rotation du plateau est un recalcul de projection
 * appliqué aux coordonnées logiques (docs/design.md section 8) : rien n'est jamais
 * pivoté au niveau du rendu, ce qui garde le dessin procédural net à tout angle.
 */
export interface IsoProjection {
  readonly tileWidth: number;
  readonly tileHeight: number;
  /** Décalage vertical à l'écran d'un niveau de hauteur. */
  readonly heightUnit: number;
  /** Angle de rotation du plateau, en radians. */
  readonly rotation: number;
  /** Centre de rotation, en coordonnées logiques. */
  readonly pivot: Coord;
}

export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

function rotate(coord: Coord, proj: IsoProjection): ScreenPoint {
  const cos = Math.cos(proj.rotation);
  const sin = Math.sin(proj.rotation);
  const dx = coord.x - proj.pivot.x;
  const dy = coord.y - proj.pivot.y;
  return {
    x: dx * cos - dy * sin + proj.pivot.x,
    y: dx * sin + dy * cos + proj.pivot.y,
  };
}

export function project(coord: Coord, height: number, proj: IsoProjection): ScreenPoint {
  const r = rotate(coord, proj);
  return {
    x: (r.x - r.y) * (proj.tileWidth / 2),
    y: (r.x + r.y) * (proj.tileHeight / 2) - height * proj.heightUnit,
  };
}

/**
 * Clé de tri du peintre : les cases les plus éloignées de la caméra se dessinent en
 * premier. Après rotation, la profondeur reste la somme des coordonnées projetées.
 */
export function depthOf(coord: Coord, proj: IsoProjection): number {
  const r = rotate(coord, proj);
  return r.x + r.y;
}

/** Interpolation d'angle par le plus court chemin, pour une rotation continue. */
export function lerpAngle(from: number, to: number, t: number): number {
  const tau = Math.PI * 2;
  const delta = (((to - from) % tau) + tau + Math.PI) % tau - Math.PI;
  return from + delta * t;
}
