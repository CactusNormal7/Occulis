import { ConfigurablePieceType } from "../configurable-piece-type.js";
import type { PieceType } from "../piece-type.js";

/**
 * Les chiffres d'avant `provisional-3`, figés ici pour les parties qui les référencent.
 *
 * Une partie se rejoue depuis son log avec le ruleset de sa création
 * (docs/architecture.md section 3) : resserrer les portées dans les classes du roster
 * aurait rendu illégaux des coups déjà joués. Ces types sont donc des **données**, que
 * plus rien ne doit faire évoluer — les classes de `roster/` portent les chiffres courants.
 *
 * Portées volontairement démesurées (docs/implementation-notes #14) : c'est ce qui avait
 * rendu la règle de mat injouable, et la raison du resserrement.
 */
export function legacyCommander(): PieceType {
  return new ConfigurablePieceType({
    kind: "commander",
    movement: { steps: 3, adjacency: "octile", canClimb: true },
    vision: { range: 14 },
    role: "commander",
  });
}

export function legacyScout(): PieceType {
  return new ConfigurablePieceType({
    kind: "scout",
    movement: { steps: 6, adjacency: "octile", canClimb: true },
    vision: { range: 20 },
    role: "special",
  });
}

export function legacyPawn(): PieceType {
  return new ConfigurablePieceType({
    kind: "pawn",
    movement: { steps: 1, adjacency: "octile", canClimb: true },
    vision: { range: 6 },
    role: "pawn",
  });
}

/**
 * Le roi d'un pas des parties `provisional-3` et `provisional-4` (décision du 2026-11-16),
 * figé quand il a gagné sa case de plus en ligne droite (`provisional-5`).
 */
export function oneStepCommander(): PieceType {
  return new ConfigurablePieceType({
    kind: "commander",
    movement: { steps: 1, adjacency: "octile", canClimb: true },
    vision: { range: 14 },
    role: "commander",
  });
}

/** Le pion d'un pas des parties `provisional-3` et `provisional-4`, figé comme le roi. */
export function oneStepPawn(): PieceType {
  return new ConfigurablePieceType({
    kind: "pawn",
    movement: { steps: 1, adjacency: "octile", canClimb: true },
    vision: { range: 6 },
    role: "pawn",
  });
}
