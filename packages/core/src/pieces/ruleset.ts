import type { Piece, PieceKind } from "./piece.js";
import type { PieceType } from "./piece-type.js";

/**
 * Table des types de pièces d'une partie, fournie par la carte ou le mode de jeu.
 *
 * Les règles sont versionnées par partie et non par connexion
 * (docs/architecture.md) : un `Ruleset` est construit une fois au démarrage d'une
 * partie et ne change plus, ce qui suppose qu'il ne détient aucun état.
 */
export class Ruleset {
  private readonly types: ReadonlyMap<PieceKind, PieceType>;

  constructor(types: Iterable<PieceType>) {
    this.types = new Map([...types].map((type) => [type.kind, type]));
  }

  get(kind: PieceKind): PieceType {
    const type = this.types.get(kind);
    if (type === undefined) {
      throw new Error(`Ruleset: type de pièce inconnu "${kind}"`);
    }
    return type;
  }

  /** Raccourci de loin le plus fréquent : remonter d'une pièce en jeu à ses règles. */
  typeOf(piece: Piece): PieceType {
    return this.get(piece.kind);
  }

  kinds(): PieceKind[] {
    return [...this.types.keys()];
  }
}
