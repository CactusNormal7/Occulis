import { type Action, type Coord, type Piece, type Result, err, ok } from "@occulis/core";

/**
 * Grammaire de la saisie au clavier. Module pur : il ne lit aucun DOM et ne
 * connaît pas la partie en cours — la résolution d'une coordonnée en pièce lui est
 * fournie, ce qui le rend testable seul.
 *
 *   1,6 2,5        déplace la pièce en (1,6) vers (2,5)
 *   1,6 > 2,5      identique : la flèche est facultative
 *   abandon        abandonne la partie
 *
 * Un tour se réduit à un déplacement : la capture est retirée le temps de
 * reconstruire la géométrie du jeu (docs/design.md section 3.1).
 */

export type Command =
  | { readonly kind: "move"; readonly from: Coord; readonly to: Coord }
  | { readonly kind: "resign" };

export type CommandFault =
  | { readonly code: "empty" }
  | { readonly code: "bad-coord"; readonly token: string }
  | { readonly code: "missing-destination" }
  | { readonly code: "trailing"; readonly token: string }
  | { readonly code: "no-piece-here"; readonly coord: Coord };

const RESIGN_WORDS = ["abandon", "abandonne", "resign"];
const COORD = /^(-?\d+),(-?\d+)$/;

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/->|→|>/g, " ")
    .replace(/\s*,\s*/g, ",")
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

function parseCoord(token: string): Coord | undefined {
  const match = COORD.exec(token);
  if (match?.[1] === undefined || match[2] === undefined) return undefined;
  return { x: Number(match[1]), y: Number(match[2]) };
}

export function parseCommand(input: string): Result<Command, CommandFault> {
  const trimmed = input.trim();
  if (trimmed.length === 0) return err({ code: "empty" });
  if (RESIGN_WORDS.includes(trimmed.toLowerCase())) return ok({ kind: "resign" });

  const tokens = tokenize(trimmed);
  const [fromToken, ...rest] = tokens;
  if (fromToken === undefined) return err({ code: "empty" });

  const from = parseCoord(fromToken);
  if (from === undefined) return err({ code: "bad-coord", token: fromToken });

  const destinationToken = rest.shift();
  if (destinationToken === undefined) return err({ code: "missing-destination" });

  const to = parseCoord(destinationToken);
  if (to === undefined) return err({ code: "bad-coord", token: destinationToken });
  if (rest.length > 0) return err({ code: "trailing", token: rest[0] ?? "" });

  return ok({ kind: "move", from, to });
}

/**
 * Traduit une commande en action de `core`, en résolvant les coordonnées saisies
 * vers les pièces qui les occupent. `core` raisonne en identifiants de pièces, le
 * joueur en cases : c'est ici, et nulle part ailleurs, que les deux se rejoignent.
 */
export function toAction(
  command: Command,
  pieceAt: (coord: Coord) => Piece | undefined,
): Result<Action, CommandFault> {
  if (command.kind === "resign") return ok({ kind: "resign" });

  const piece = pieceAt(command.from);
  if (piece === undefined) return err({ code: "no-piece-here", coord: command.from });

  return ok({ kind: "move", pieceId: piece.id, to: command.to });
}
