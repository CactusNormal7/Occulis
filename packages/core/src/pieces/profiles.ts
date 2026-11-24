import type { Adjacency, Coord } from "../coord.js";

/**
 * Caractéristiques chiffrées d'un type de pièce, séparées du comportement.
 *
 * Elles vivent dans leur propre module pour que `movement.ts` et `los.ts`, qui
 * les consomment, n'aient pas à connaître la hiérarchie de classes qui les
 * déclare — sans quoi le graphe de dépendances serait circulaire.
 */

/**
 * Une direction de glissement et sa portée, comme aux échecs : la pièce avance case par
 * case dans `direction` sans jamais tourner, jusqu'à `reach` cases (`Infinity` : jusqu'au
 * premier obstacle, comme la tour ou le fou).
 */
export interface MovementLine {
  readonly direction: Coord;
  readonly reach: number;
}

export interface MovementProfile {
  /**
   * Nombre de pas horizontaux par tour. Pour une pièce qui glisse (`lines`), la plus
   * longue de ses lignes : c'est ce qu'affichent les fiches.
   */
  readonly steps: number;
  readonly adjacency: Adjacency;
  /**
   * Autorise la montée d'un niveau. Grimper est une capacité de toutes les pièces
   * (docs/design.md point ouvert 7, tranché le 2026-10-27) ; le champ reste déclaré par
   * pièce pour les types de test qui s'en passent.
   */
  readonly canClimb: boolean;
  /**
   * Absent : la pièce marche librement, `steps` pas dans les directions de `adjacency`,
   * et peut contourner un obstacle. Présent : elle glisse **en ligne droite** dans l'une
   * de ces directions seulement (docs/design/rules.md section 5.3, « proche des échecs »).
   */
  readonly lines?: readonly MovementLine[];
}

const ORTHOGONAL_DIRECTIONS: readonly Coord[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

const DIAGONAL_DIRECTIONS: readonly Coord[] = [
  { x: 1, y: 1 },
  { x: 1, y: -1 },
  { x: -1, y: 1 },
  { x: -1, y: -1 },
];

/** Les quatre lignes de la tour, chacune de portée `reach`. */
export function orthogonalLines(reach: number): readonly MovementLine[] {
  return ORTHOGONAL_DIRECTIONS.map((direction) => ({ direction, reach }));
}

/** Les quatre diagonales du fou, chacune de portée `reach`. */
export function diagonalLines(reach: number): readonly MovementLine[] {
  return DIAGONAL_DIRECTIONS.map((direction) => ({ direction, reach }));
}

/** La plus longue portée d'une famille de lignes (0 si la pièce n'en a aucune). */
export function lineReach(
  lines: readonly MovementLine[],
  family: "orthogonal" | "diagonal",
): number {
  const wanted = (line: MovementLine) =>
    (line.direction.x === 0 || line.direction.y === 0) === (family === "orthogonal");
  return lines.filter(wanted).reduce((longest, line) => Math.max(longest, line.reach), 0);
}

export interface VisionProfile {
  /** Distance de Chebyshev. Infinity = vision limitée uniquement par l'occultation. */
  readonly range: number;
}
