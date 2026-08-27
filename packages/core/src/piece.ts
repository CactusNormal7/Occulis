import type { Adjacency, Coord } from "./coord.js";

export type PlayerId = "A" | "B";

export function opponentOf(player: PlayerId): PlayerId {
  return player === "A" ? "B" : "A";
}

export type PieceId = string;

/** Identifiant de type de pièce. Le roster reste à définir (docs/design.md point ouvert 12). */
export type PieceKind = string;

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

export interface PieceDefinition {
  readonly kind: PieceKind;
  readonly movement: MovementProfile;
  readonly vision: VisionProfile;
  /**
   * Pièce maîtresse à protéger. Sa capture met fin à la partie.
   * Aucune spécificité de mouvement pour l'instant (docs/design.md section 7).
   */
  readonly isCommander: boolean;
}

export interface Piece {
  readonly id: PieceId;
  readonly kind: PieceKind;
  readonly owner: PlayerId;
  readonly coord: Coord;
}

/** Table des définitions de pièces d'une partie. Fournie par la carte/le mode de jeu. */
export class Ruleset {
  private readonly definitions: ReadonlyMap<PieceKind, PieceDefinition>;

  constructor(definitions: Iterable<PieceDefinition>) {
    this.definitions = new Map([...definitions].map((d) => [d.kind, d]));
  }

  get(kind: PieceKind): PieceDefinition {
    const definition = this.definitions.get(kind);
    if (definition === undefined) {
      throw new Error(`Ruleset: type de pièce inconnu "${kind}"`);
    }
    return definition;
  }
}
