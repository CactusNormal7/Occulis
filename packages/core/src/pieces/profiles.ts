import type { Adjacency } from "../coord.js";

/**
 * Caractéristiques chiffrées d'un type de pièce, séparées du comportement.
 *
 * Elles vivent dans leur propre module pour que `movement.ts` et `los.ts`, qui
 * les consomment, n'aient pas à connaître la hiérarchie de classes qui les
 * déclare — sans quoi le graphe de dépendances serait circulaire.
 */

export interface MovementProfile {
  /** Nombre de pas horizontaux par tour. */
  readonly steps: number;
  readonly adjacency: Adjacency;
  /**
   * Autorise la montée d'un niveau. Grimper comme capacité générique ou spécifique
   * n'est pas tranché (docs/design.md point ouvert 7) : c'est donc déclaré par pièce.
   */
  readonly canClimb: boolean;
}

export interface VisionProfile {
  /** Distance de Chebyshev. Infinity = vision limitée uniquement par l'occultation. */
  readonly range: number;
}
