import type { Adjacency } from "./coord.js";
import type { Piece, PieceDefinition, PieceId, PlayerId } from "./piece.js";
import { Ruleset } from "./piece.js";

/**
 * Fabriques de test uniquement. Aucun roster n'est acté dans docs/design.md
 * (point ouvert 12) : ces définitions sont des supports de scénario, pas du contenu.
 */
export interface DefineOptions {
  readonly steps?: number;
  readonly adjacency?: Adjacency;
  readonly canClimb?: boolean;
  readonly vision?: number;
  readonly isCommander?: boolean;
}

export function definePiece(kind: string, options: DefineOptions = {}): PieceDefinition {
  return {
    kind,
    movement: {
      steps: options.steps ?? 1,
      adjacency: options.adjacency ?? "octile",
      canClimb: options.canClimb ?? true,
    },
    vision: { range: options.vision ?? Number.POSITIVE_INFINITY },
    isCommander: options.isCommander ?? false,
  };
}

export function testRuleset(...definitions: PieceDefinition[]): Ruleset {
  return new Ruleset(definitions);
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
