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
   * Autorise la montée d'un niveau. Grimper est une capacité de toutes les pièces
   * (docs/design.md point ouvert 7, tranché le 2026-10-27) ; le champ reste déclaré par
   * pièce pour les types de test qui s'en passent.
   */
  readonly canClimb: boolean;
}

export interface VisionProfile {
  /** Distance de Chebyshev. Infinity = vision limitée uniquement par l'occultation. */
  readonly range: number;
}
