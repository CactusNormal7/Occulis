import type { Piece, PieceKind } from "./piece.js";
import type { PieceRole, PieceType } from "./piece-type.js";

/**
 * La composition exigée d'une équipe : combien de pièces de chaque rôle, **exactement**.
 * Fixée par le ruleset, donc versionnée par partie comme le reste des règles.
 */
export type TeamRules = Readonly<Record<PieceRole, number>>;

/**
 * Les seuils des nulles anti-blocage (docs/design/rules.md 7.2). `withoutCapture` compte
 * des **actions**, pas des rondes : 60 actions valent 30 tours par camp.
 */
export interface DrawRules {
  /** Nombre d'occurrences d'une même position qui met fin à la partie. */
  readonly repetition: number;
  /** Nombre d'actions consécutives sans prise qui met fin à la partie. */
  readonly withoutCapture: number;
}

/**
 * Les règles du moteur qui ne tiennent pas à un type de pièce : la prise, l'échec et les
 * nulles. Elles vivent dans le ruleset parce qu'une partie se rejoue depuis son log
 * avec **ses** règles (docs/architecture.md section 3) : une partie commencée avant le
 * retour de la prise doit se rejouer sans elle, indéfiniment.
 */
export interface EngineRules {
  /** Une pièce prend en arrivant sur la case d'une pièce adverse (rules.md 3.1). */
  readonly capture: boolean;
  /**
   * « Échecs strict » (rules.md 7.1) : un coup qui laisse son roi prenable est illégal,
   * et une partie sans coup légal se termine — mat si le roi est menacé, pat sinon.
   * N'a de sens qu'avec `capture`.
   */
  readonly check: boolean;
  /** `null` : aucune nulle automatique. */
  readonly draws: DrawRules | null;
}

/** Les règles d'avant le retour de la prise : on ne fait que se déplacer, seul l'abandon termine. */
export const MOVE_ONLY_RULES: EngineRules = { capture: false, check: false, draws: null };

/**
 * Prise, échec et mat, et les deux nulles des échecs modernes. Les seuils reprennent ceux
 * d'avant le retrait (docs/implementation-notes #17) : un point de départ, pas un équilibrage.
 */
export const STRICT_CHESS_RULES: EngineRules = {
  capture: true,
  check: true,
  draws: { repetition: 3, withoutCapture: 60 },
};

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
  /** `MOVE_ONLY_RULES` par défaut : un ruleset ne gagne la prise qu'en la déclarant. */
  readonly rules: EngineRules;

  constructor(
    types: Iterable<PieceType>,
    team: TeamRules | null = null,
    rules: EngineRules = MOVE_ONLY_RULES,
  ) {
    if (rules.check && !rules.capture) {
      throw new Error("Ruleset: `check` requires `capture`");
    }
    this.types = new Map([...types].map((type) => [type.kind, type]));
    this.team = team;
    this.rules = rules;
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
