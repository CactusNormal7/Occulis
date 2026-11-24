import { type AbilityKind, type PieceRole, PieceType } from "./piece-type.js";
import type { PieceKind } from "./piece.js";
import type { MovementProfile, VisionProfile } from "./profiles.js";

/** Caractéristiques d'un type de pièce décrit par des données plutôt que par une classe. */
export interface PieceProfile {
  readonly kind: PieceKind;
  readonly movement: MovementProfile;
  readonly vision: VisionProfile;
  readonly isCommander?: boolean;
  /** `special` par défaut ; `isCommander: true` vaut `commander`. */
  readonly role?: PieceRole;
  /** Aucune par défaut. */
  readonly ability?: AbilityKind | null;
}

/**
 * Type de pièce configuré à la construction, sans comportement propre.
 *
 * C'est ce qui permet à un appelant — un scénario, un test, un futur éditeur de
 * carte — de fournir ses propres définitions sans écrire de classe. Une pièce qui
 * a un comportement, elle, doit hériter de `PieceType` dans son propre fichier.
 */
export class ConfigurablePieceType extends PieceType {
  readonly kind: PieceKind;
  readonly movement: MovementProfile;
  readonly vision: VisionProfile;
  private readonly declaredRole: PieceRole;
  private readonly declaredAbility: AbilityKind | null;

  constructor(profile: PieceProfile) {
    super();
    this.kind = profile.kind;
    this.movement = profile.movement;
    this.vision = profile.vision;
    this.declaredRole = profile.role ?? (profile.isCommander === true ? "commander" : "special");
    this.declaredAbility = profile.ability ?? null;
  }

  override get ability(): AbilityKind | null {
    return this.declaredAbility;
  }

  override get role(): PieceRole {
    return this.declaredRole;
  }
}
