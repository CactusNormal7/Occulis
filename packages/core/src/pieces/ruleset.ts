import type { Piece, PieceKind } from "./piece.js";
import type { PieceRole, PieceType } from "./piece-type.js";

/**
 * La composition exigée d'une équipe : combien de pièces de chaque rôle, **exactement**.
 * Fixée par le ruleset, donc versionnée par partie comme le reste des règles.
 */
export type TeamRules = Readonly<Record<PieceRole, number>>;

/**
 * Table des types de pièces d'une partie, fournie par la carte ou le mode de jeu.
 *
 * Les règles sont versionnées par partie et non par connexion
 * (docs/architecture.md) : un `Ruleset` est construit une fois au démarrage d'une
 * partie et ne change plus, ce qui suppose qu'il ne détient aucun état.
 */
export class Ruleset {
  private readonly types: ReadonlyMap<PieceKind, PieceType>;
  /**
   * `null` : ce ruleset ne connaît pas de composition d'équipe, ses parties partent de
   * la position du scénario. C'est le cas des versions antérieures au déploiement, que
   * les parties qui les référencent doivent pouvoir rejouer telles quelles.
   */
  readonly team: TeamRules | null;

  constructor(types: Iterable<PieceType>, team: TeamRules | null = null) {
    this.types = new Map([...types].map((type) => [type.kind, type]));
    this.team = team;
  }

  get(kind: PieceKind): PieceType {
    const type = this.types.get(kind);
    if (type === undefined) {
      throw new Error(`Ruleset: unknown piece kind "${kind}"`);
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

  has(kind: PieceKind): boolean {
    return this.types.has(kind);
  }

  /** Les types d'un rôle, dans l'ordre de déclaration : ce qu'un joueur peut choisir pour ce rôle. */
  kindsOf(role: PieceRole): PieceKind[] {
    return [...this.types.values()].filter((type) => type.role === role).map((type) => type.kind);
  }
}
