import type { Adjacency } from "./coord.js";
import {
  type AbilityKind,
  ConfigurablePieceType,
  type Piece,
  type PieceId,
  type PieceType,
  type EngineRules,
  type PlayerId,
  Ruleset,
  STRICT_CHESS_RULES,
} from "./pieces/index.js";

/**
 * Fabriques de test uniquement. Aucun roster n'est acté dans docs/design.md
 * (point ouvert 12) : ces types sont des supports de scénario, pas du contenu.
 * Le roster provisoire partagé par le client et le serveur vit dans
 * `pieces/roster/`.
 */
export interface DefineOptions {
  readonly steps?: number;
  readonly adjacency?: Adjacency;
  readonly canClimb?: boolean;
  readonly vision?: number;
  readonly isCommander?: boolean;
  readonly ability?: AbilityKind;
}

export function definePiece(kind: string, options: DefineOptions = {}): PieceType {
  return new ConfigurablePieceType({
    kind,
    movement: {
      steps: options.steps ?? 1,
      adjacency: options.adjacency ?? "octile",
      canClimb: options.canClimb ?? true,
    },
    vision: { range: options.vision ?? Number.POSITIVE_INFINITY },
    isCommander: options.isCommander ?? false,
    ability: options.ability ?? null,
  });
}

/** Un ruleset d'avant la prise : on ne fait que se déplacer. */
export function testRuleset(...types: PieceType[]): Ruleset {
  return new Ruleset(types);
}

/** Un ruleset avec prise, échec et nulles — ou les règles de moteur fournies. */
export function chessRuleset(types: PieceType[], rules: EngineRules = STRICT_CHESS_RULES): Ruleset {
  return new Ruleset(types, null, rules);
}

export function placePiece(
  id: PieceId,
  kind: string,
  owner: PlayerId,
  x: number,
  y: number,
): Piece {
  return { id, kind, owner, coord: { x, y } };
}
