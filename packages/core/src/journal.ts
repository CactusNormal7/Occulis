import { type Coord, type CoordKey, coordKey } from "./coord.js";
import type { PieceKind, PlayerId } from "./pieces/index.js";
import type { GameState } from "./state.js";

/**
 * Un coup **tel qu'un joueur l'a vu** — une ligne du journal de partie de l'ATH.
 *
 * Ses propres coups sont toujours connus en entier. D'un coup adverse, le joueur ne sait
 * que ce que sa ligne de vue lui en a montré : la case de départ s'il la voyait avant le
 * coup, la case d'arrivée s'il la voit après, et le type de la pièce s'il a vu l'une ou
 * l'autre. Un champ absent est une chose que le joueur **ne sait pas** — jamais une chose
 * masquée à l'affichage : le journal suit le fog appliqué à la source.
 *
 * Exception : une prise subie est toujours connue, même hors de vue. Le joueur perd la
 * pièce, il sait donc où et laquelle (mais pas forcément ce qui l'a prise).
 */
export interface JournalEntry {
  /** Le numéro du coup, compté depuis 1 (`GameState.turn` après le coup). */
  readonly turn: number;
  /** Le camp qui a joué. */
  readonly player: PlayerId;
  /** Le type de la pièce jouée, si le joueur l'a vue partir ou arriver. */
  readonly kind?: PieceKind | undefined;
  /** La case de départ, si le joueur la voyait avant le coup. */
  readonly from?: Coord | undefined;
  /** La case d'arrivée, si le joueur la voit après le coup ou y a perdu une pièce. */
  readonly to?: Coord | undefined;
  /** Le type de la pièce prise, quand le joueur sait qu'il y a eu prise. */
  readonly captured?: PieceKind | undefined;
}

/** Ce qu'il faut savoir pour décrire le dernier coup à un joueur. */
export interface JournalContext {
  readonly observer: PlayerId;
  /** La position avant le coup. */
  readonly before: GameState;
  /** La position après le coup ; son dernier `history` est le coup à décrire. */
  readonly after: GameState;
  /** Les cases que l'observateur voyait avant le coup. */
  readonly seenBefore: ReadonlySet<CoordKey>;
  /** Les cases qu'il voit après le coup. */
  readonly seenAfter: ReadonlySet<CoordKey>;
}

/**
 * La ligne de journal du dernier coup de `after`, du point de vue de `observer`.
 *
 * Rend `undefined` pour une action qui n'est pas un déplacement (l'abandon) : la fin de
 * partie se dit ailleurs, par l'issue.
 */
export function journalEntryFor(context: JournalContext): JournalEntry | undefined {
  const { observer, before, after, seenBefore, seenAfter } = context;
  const record = after.history.at(-1);
  if (record === undefined || record.action.kind !== "move") return undefined;

  const mover = before.pieces.get(record.action.pieceId);
  if (mover === undefined) return undefined;

  const from = mover.coord;
  const to = record.action.to;
  const captured = record.captured;

  if (record.player === observer) {
    return {
      turn: after.turn,
      player: record.player,
      kind: mover.kind,
      from,
      to,
      captured: captured?.kind,
    };
  }

  const departureSeen = seenBefore.has(coordKey(from));
  const arrivalSeen = seenAfter.has(coordKey(to));
  // Seul l'adversaire de l'observateur peut jouer ici : une prise est forcément la sienne.
  const lostHere = captured !== undefined && captured.owner === observer;

  return {
    turn: after.turn,
    player: record.player,
    kind: departureSeen || arrivalSeen ? mover.kind : undefined,
    from: departureSeen ? from : undefined,
    to: arrivalSeen || lostHere ? to : undefined,
    captured: arrivalSeen || lostHere ? captured?.kind : undefined,
  };
}
