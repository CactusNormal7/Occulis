import { type Action, type Coord, type Piece, type Result, err, ok } from "@occulis/core";

/**
 * Grammaire de la saisie au clavier. Module pur : il ne lit aucun DOM et ne
 * connaît pas la partie en cours — la résolution d'une coordonnée en pièce lui est
 * fournie, ce qui le rend testable seul.
 *
 *   1,6 2,5        déplace la pièce en (1,6) vers (2,5)
 *   1,6 > 2,5      identique : la flèche est facultative
 *   1,6 2,5 x 3,5  se déplace en (2,5) puis capture la pièce en (3,5)
 *   1,6 x 1,5      frappe un adjacent sans bouger
 *   abandon        abandonne la partie
 */

export type Command =
  | {
      readonly kind: "move";
      readonly from: Coord;
      readonly to: Coord;
      readonly capture?: Coord | undefined;
    }
  | { readonly kind: "resign" };

export type CommandFault =
  | { readonly code: "empty" }
  | { readonly code: "bad-coord"; readonly token: string }
  | { readonly code: "missing-destination" }
  | { readonly code: "missing-target" }
  | { readonly code: "trailing"; readonly token: string }
  | { readonly code: "no-piece-here"; readonly coord: Coord }
  | { readonly code: "no-target-here"; readonly coord: Coord };

const RESIGN_WORDS = ["abandon", "abandonne", "resign"];
const COORD = /^(-?\d+),(-?\d+)$/;

/** `x` sépare la capture ; il n'apparaît jamais dans une coordonnée. */
function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/->|→|>/g, " ")
    .replace(/\s*,\s*/g, ",")
    .replace(/x/g, " x ")
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

  // Une frappe sur place s'écrit sans destination : `1,6 x 1,5`.
  const strikeOnly = rest[0] === "x";
  const destinationToken = strikeOnly ? undefined : rest.shift();
  if (!strikeOnly && destinationToken === undefined) return err({ code: "missing-destination" });

  const to = destinationToken === undefined ? from : parseCoord(destinationToken);
  if (to === undefined) return err({ code: "bad-coord", token: destinationToken ?? "" });

  if (rest.length === 0) return ok({ kind: "move", from, to });
  if (rest[0] !== "x") return err({ code: "trailing", token: rest[0] ?? "" });

  const targetToken = rest[1];
  if (targetToken === undefined) return err({ code: "missing-target" });
  const capture = parseCoord(targetToken);
  if (capture === undefined) return err({ code: "bad-coord", token: targetToken });
  if (rest.length > 2) return err({ code: "trailing", token: rest[2] ?? "" });

  return ok({ kind: "move", from, to, capture });
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

  if (command.capture === undefined) return ok({ kind: "move", pieceId: piece.id, to: command.to });

  const target = pieceAt(command.capture);
  // Une pièce qui reste sur place occupe encore sa case de départ : elle ne peut
  // pas être sa propre cible.
  if (target === undefined || target.id === piece.id) {
    return err({ code: "no-target-here", coord: command.capture });
  }
  return ok({ kind: "move", pieceId: piece.id, to: command.to, capture: target.id });
}
