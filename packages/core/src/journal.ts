import { type Coord, type CoordKey, coordKey } from "./coord.js";
import type { AbilityKind, PieceKind, PlayerId } from "./pieces/index.js";
import type { ActionRecord, GameState } from "./state.js";

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
 * pièce, il sait donc où et laquelle (mais pas forcément ce qui l'a prise). De même, un
 * piège qui se déclenche est connu des deux camps : l'un y perd sa pièce, l'autre sait où
 * était son piège.
 *
 * Une capacité adverse n'est connue que si le joueur voyait la pièce qui l'a exercée, et
 * jamais sa cible : un piège posé reste invisible (docs/design/rules.md section 4).
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
  /** La pièce a exercé sa capacité au lieu de se déplacer, si le joueur l'a vue faire. */
  readonly ability?: AbilityKind | undefined;
  /** La case visée par la capacité : connue de son seul auteur. */
  readonly target?: Coord | undefined;
  /** La pièce jouée a fini sur un piège, qui l'a prise. */
  readonly trapped?: PieceKind | undefined;
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
 * Rend `undefined` pour l'abandon : la fin de partie se dit ailleurs, par l'issue.
 */
export function journalEntryFor(context: JournalContext): JournalEntry | undefined {
  const record = context.after.history.at(-1);
  if (record === undefined || record.action.kind === "resign") return undefined;

  const actor = context.before.pieces.get(record.action.pieceId);
  if (actor === undefined) return undefined;

  return record.action.kind === "move"
    ? moveEntry(context, record, actor.kind, actor.coord, record.action.to)
    : abilityEntry(context, record, actor.kind, actor.coord, record.action.target);
}

function moveEntry(
  context: JournalContext,
  record: ActionRecord,
  kind: PieceKind,
  from: Coord,
  to: Coord,
): JournalEntry {
  const { observer, after, seenBefore, seenAfter } = context;
  const { player, captured } = record;
  const trapped = record.trapped?.kind;

  if (player === observer) {
    return { turn: after.turn, player, kind, from, to, captured: captured?.kind, trapped };
  }

  const departureSeen = seenBefore.has(coordKey(from));
  const arrivalSeen = seenAfter.has(coordKey(to));
  // Seul l'adversaire de l'observateur peut jouer ici : une prise est forcément la sienne,
  // et un piège qui se déclenche, forcément celui de l'observateur.
  const lostHere = captured !== undefined && captured.owner === observer;
  // Le piège révèle la pièce qu'il prend ; une prise subie ne dit pas qui l'a faite.
  const sprungHere = trapped !== undefined;

  return {
    turn: after.turn,
    player,
    kind: departureSeen || arrivalSeen || sprungHere ? kind : undefined,
    from: departureSeen ? from : undefined,
    to: arrivalSeen || lostHere || sprungHere ? to : undefined,
    captured: arrivalSeen || lostHere ? captured?.kind : undefined,
    trapped,
  };
}

function abilityEntry(
  context: JournalContext,
  record: ActionRecord,
  kind: PieceKind,
  from: Coord,
  target: Coord,
): JournalEntry {
  const { observer, before, after, seenBefore } = context;
  const { player } = record;
  const ability = before.ruleset.get(kind).ability ?? undefined;

  if (player === observer) return { turn: after.turn, player, kind, from, ability, target };
  if (!seenBefore.has(coordKey(from))) return { turn: after.turn, player };
  return { turn: after.turn, player, kind, from, ability };
}
