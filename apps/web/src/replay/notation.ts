import type { Coord, PlayerId } from "@occulis/core";
import type { AdminFrame, AdminFramePiece, AdminMatchDetail } from "@occulis/protocol";
import { messages } from "../locale/current.js";

/**
 * La notation des coups dans l'historique du rejeu, sur le modèle de la notation
 * algébrique des échecs. Pur : lit le log et les images, ne dessine rien.
 *
 * - une case : sa colonne en lettre (`a` à l'ouest), puis sa rangée comptée depuis le
 *   bord du camp A (`1` au sud) — `b3` ;
 * - une pièce : sa lettre, `K` roi, `S` éclaireur, `T` trappeur, `P` pion — fixe, quelle
 *   que soit la langue ;
 * - `Sb3-c4` un déplacement, `Pe4xd5` une prise, `Tf3^g3` un piège posé, `Pe4-f3^` une pièce
 *   prise au piège, `#` un échec et mat ; un abandon s'écrit par le score, `1-0` ou `0-1`
 *   (A d'abord).
 *
 * Chaque notation vient avec la phrase qui l'explique, montrée au survol.
 */
export interface MoveNotation {
  /** La notation : « Sb3-c4 ». */
  readonly short: string;
  /** Ce qu'elle dit, en toutes lettres : « Éclaireur de b3 à c4 ». */
  readonly detail: string;
}

const PIECE_LETTERS: Readonly<Record<string, string>> = {
  commander: "K",
  scout: "S",
  bishop: "B",
  rook: "R",
  trapper: "T",
  pawn: "P",
};

export function pieceLetter(kind: string): string {
  return PIECE_LETTERS[kind] ?? kind.charAt(0).toUpperCase();
}

/** Le nom d'une case : `b3`. `rows` est le nombre de rangées de la carte. */
export function squareName(coord: Coord, rows: number): string {
  return `${String.fromCharCode(97 + coord.x)}${rows - coord.y}`;
}

export type NotatedMatch = Pick<AdminMatchDetail, "log" | "frames" | "outcome" | "board">;

/** Le nombre de rangées : celui de la carte, ou à défaut ce que les pièces en montrent. */
function rowsOf(match: NotatedMatch): number {
  const ys =
    match.board !== null && match.board.length > 0
      ? match.board.map((tile) => tile.coord.y)
      : match.frames.flatMap((frame) => frame.pieces.map((piece) => piece.y));
  return Math.max(0, ...ys) + 1;
}

const other = (seat: PlayerId): PlayerId => (seat === "A" ? "B" : "A");

function kindName(kind: string): string {
  return messages().team.kinds[kind] ?? kind;
}

function at(piece: AdminFramePiece): Coord {
  return { x: piece.x, y: piece.y };
}

/** La pièce adverse qui se tenait sur `to` avant le coup, et n'y est plus après. */
function takenOn(before: AdminFrame, after: AdminFrame, mover: AdminFramePiece, to: Coord) {
  const taken = before.pieces.find(
    (piece) => piece.owner !== mover.owner && piece.x === to.x && piece.y === to.y,
  );
  if (taken === undefined) return undefined;
  return after.pieces.some((piece) => piece.id === taken.id) ? undefined : taken;
}

/** La notation du coup `seq`, ou `undefined` si le rejeu ne l'a pas atteint. */
export function notationOf(match: NotatedMatch, seq: number): MoveNotation | undefined {
  const entry = match.log[seq];
  const before = match.frames[seq];
  const after = match.frames[seq + 1];
  if (entry === undefined) return undefined;
  const m = messages().admin.match.notation;
  const { action } = entry;

  if (action.kind === "resign") {
    const seat = entry.player;
    if (seat === null) return undefined;
    const winner = other(seat);
    return { short: winner === "A" ? "1-0" : "0-1", detail: m.resign(seat, winner) };
  }
  if (before === undefined || after === undefined) return undefined;

  const rows = rowsOf(match);
  const square = (coord: Coord) => squareName(coord, rows);
  const mover = before.pieces.find((piece) => piece.id === action.pieceId);
  if (mover === undefined) return undefined;
  const letter = pieceLetter(mover.kind);
  const from = square(at(mover));
  const name = kindName(mover.kind);

  if (action.kind === "ability") {
    const target = square(action.target);
    return { short: `${letter}${from}^${target}`, detail: m.layTrap(name, from, target) };
  }

  const to = square(action.to);
  const taken = takenOn(before, after, mover, action.to);
  // Seul un piège fait disparaître la pièce qui joue.
  const trapped = !after.pieces.some((piece) => piece.id === mover.id);
  const mate =
    seq === match.log.length - 1 &&
    match.outcome?.kind === "victory" &&
    match.outcome.reason === "checkmate";

  let short = `${letter}${from}${taken === undefined ? "-" : "x"}${to}`;
  let detail = m.move(name, from, to);
  if (taken !== undefined) detail += m.takes(kindName(taken.kind));
  if (trapped) {
    short += "^";
    detail += m.trapped;
  }
  if (mate) {
    short += "#";
    detail += m.checkmate;
  }
  return { short, detail };
}
