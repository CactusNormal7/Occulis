import {
  type Adjacency,
  type Coord,
  type Piece,
  type PieceRole,
  type PlayerView,
  type Ruleset,
  coordEquals,
} from "@occulis/core";

/**
 * La fiche d'une pièce, telle que le joueur a le droit de la lire. Module pur.
 *
 * Tout vient de sa propre vue et du ruleset de la partie : ses pièces, les adverses
 * qu'il voit, et les fantômes — des souvenirs, signalés comme tels. Les caractéristiques
 * d'un type sont publiques (docs/design/rules.md section 7 : les types adverses sont
 * connus, jamais leurs positions), donc la fiche d'une pièce adverse ne révèle rien que
 * le joueur ne sache déjà en la voyant.
 */
export interface PieceSheet {
  readonly piece: Pick<Piece, "id" | "kind" | "owner" | "coord">;
  /** `ghost` : une pièce adverse hors de vue, à sa dernière position connue. */
  readonly relation: "own" | "enemy" | "ghost";
  readonly role: PieceRole;
  readonly steps: number;
  readonly adjacency: Adjacency;
  readonly canClimb: boolean;
  /** `Infinity` : seule l'occultation limite la vue. */
  readonly visionRange: number;
  /** Le tour où un fantôme a été vu pour la dernière fois. */
  readonly lastSeenTurn?: number | undefined;
  /** Vrai pour le roi du joueur quand il est en échec. */
  readonly inCheck: boolean;
}

export function inspectPiece(
  view: PlayerView,
  ruleset: Ruleset,
  coord: Coord,
): PieceSheet | undefined {
  const at = <T extends { readonly coord: Coord }>(pieces: readonly T[]): T | undefined =>
    pieces.find((piece) => coordEquals(piece.coord, coord));

  const own = at(view.ownPieces);
  const enemy = own === undefined ? at(view.visibleEnemies) : undefined;
  const ghost = own === undefined && enemy === undefined ? at(view.ghosts) : undefined;
  const piece = own ?? enemy ?? ghost;
  if (piece === undefined || !ruleset.has(piece.kind)) return undefined;

  const type = ruleset.get(piece.kind);
  return {
    piece: { id: piece.id, kind: piece.kind, owner: piece.owner, coord: piece.coord },
    relation: own !== undefined ? "own" : enemy !== undefined ? "enemy" : "ghost",
    role: type.role,
    steps: type.movement.steps,
    adjacency: type.movement.adjacency,
    canClimb: type.movement.canClimb,
    visionRange: type.vision.range,
    lastSeenTurn: ghost?.lastSeenTurn,
    inCheck: own !== undefined && type.isCommander && view.check,
  };
}

/** Deux fiches désignent-elles la même pièce au même endroit ? */
export function sameSheet(a: PieceSheet | undefined, b: PieceSheet | undefined): boolean {
  if (a === undefined || b === undefined) return a === b;
  return (
    a.piece.id === b.piece.id &&
    a.relation === b.relation &&
    coordEquals(a.piece.coord, b.piece.coord)
  );
}
