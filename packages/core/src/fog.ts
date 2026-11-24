import {
  type Action,
  type ActionError,
  type ReplayError,
  applyAction,
  legalActions,
} from "./actions.js";
import type { Trap } from "./abilities/trap.js";
import type { Board } from "./board.js";
import { isKingThreatened } from "./endgame.js";
import { type JournalEntry, journalEntryFor } from "./journal.js";
import { type Coord, type CoordKey, coordKey } from "./coord.js";
import {
  type Piece,
  type PieceId,
  type PieceKind,
  type PlayerId,
  opponentOf,
} from "./pieces/index.js";
import { type Result, err, ok } from "./result.js";
import { type GameState, occupancy, piecesOf } from "./state.js";

/** Dernière position connue d'une pièce adverse, à afficher en fantôme estompé. */
export interface RememberedPiece {
  readonly id: PieceId;
  readonly kind: PieceKind;
  readonly owner: PlayerId;
  readonly coord: Coord;
  readonly lastSeenTurn: number;
}

export interface PlayerKnowledge {
  readonly player: PlayerId;
  readonly visible: ReadonlySet<CoordKey>;
  readonly remembered: ReadonlyMap<PieceId, RememberedPiece>;
  /**
   * Les coups de la partie tels que ce joueur les a vus (`journal.ts`), dans l'ordre.
   * Tenu ici parce qu'il dépend de ce que le joueur voyait **à chaque coup** : comme la
   * mémoire fantôme, il ne se recalcule pas depuis la seule position courante.
   */
  readonly journal: readonly JournalEntry[];
}

export function emptyKnowledge(player: PlayerId): PlayerKnowledge {
  return { player, visible: new Set(), remembered: new Map(), journal: [] };
}

/**
 * Union des champs de vision des pièces d'un joueur.
 *
 * Le champ est demandé à chaque type de pièce plutôt que calculé ici à partir
 * d'une portée : c'est la pièce qui définit ce qu'elle voit (`PieceType.canSee`).
 *
 * L'occupation du plateau lui est transmise parce qu'une pièce coupe la vue au même
 * titre que le relief (docs/design.md section 5.2) : elle est calculée une fois pour
 * toutes les pièces du joueur, chaque champ de vision balayant déjà tout le plateau.
 */
export function visibleTilesFor(board: Board, state: GameState, player: PlayerId): Set<CoordKey> {
  const occupied = occupancy(state);
  const visible = new Set<CoordKey>();
  for (const piece of piecesOf(state, player)) {
    for (const key of state.ruleset.typeOf(piece).fieldOfView(board, piece.coord, occupied)) {
      visible.add(key);
    }
  }
  return visible;
}

/**
 * Fait avancer la mémoire d'un joueur (docs/design.md section 5.4).
 *
 * Une pièce adverse vue est mémorisée à sa position courante. Un souvenir n'est
 * effacé que lorsqu'il est *contredit* : si la case mémorisée redevient visible et
 * que la pièce n'y est plus, le fantôme disparaît — sinon il persiste, puisque le
 * joueur n'a aucun moyen de savoir qu'elle a bougé.
 */
export function observe(previous: PlayerKnowledge, state: GameState): PlayerKnowledge {
  const player = previous.player;
  const visible = visibleTilesFor(state.board, state, player);
  const remembered = new Map(previous.remembered);

  for (const [id, ghost] of remembered) {
    if (visible.has(coordKey(ghost.coord))) remembered.delete(id);
  }

  for (const piece of state.pieces.values()) {
    if (piece.owner === player) continue;
    if (!visible.has(coordKey(piece.coord))) continue;
    remembered.set(piece.id, {
      id: piece.id,
      kind: piece.kind,
      owner: piece.owner,
      coord: piece.coord,
      // Le tour de la position observée. L'abandon, qui clôt sans jouer, n'avance pas
      // `turn` : une pièce vue à ce moment garde le tour du dernier vrai coup.
      lastSeenTurn: state.turn,
    });
  }

  return { player, visible, remembered, journal: previous.journal };
}

/**
 * État transmissible à un joueur : ses propres pièces, les adverses réellement dans
 * sa LOS, et les fantômes hors LOS. Tout le reste est absent — pas masqué à
 * l'affichage. Le fog of war doit être appliqué à la source, sinon il est
 * contournable via les devtools (docs/design.md section 5.4).
 */
export interface PlayerView {
  readonly player: PlayerId;
  readonly activePlayer: PlayerId;
  readonly turn: number;
  readonly outcome: GameState["outcome"];
  /**
   * Les coups que ce joueur peut jouer, calculés sur la position **réelle**. Vide
   * quand il n'est pas au trait.
   *
   * Transmis parce que le client ne peut pas les recalculer : il ignore les pièces
   * hors de sa ligne de vue, donc il ne sait pas lesquelles barrent la route d'une de
   * ses pièces. Sans cette liste, l'interface propose des coups que le serveur refuse
   * et en cache qu'il accepterait.
   */
  readonly legalActions: readonly Action[];
  /**
   * Le roi de ce joueur est en échec. Jamais celui de l'adversaire, qui trahirait sa
   * position ; et calculé sur la position réelle, donc vrai aussi pour une menace que
   * le joueur ne voit pas (docs/design/rules.md 7.1). Toujours faux sous un ruleset
   * sans règle d'échec.
   */
  readonly check: boolean;
  readonly visible: ReadonlySet<CoordKey>;
  readonly ownPieces: readonly Piece[];
  readonly visibleEnemies: readonly Piece[];
  /** Fantômes : pièces mémorisées mais actuellement hors LOS. */
  readonly ghosts: readonly RememberedPiece[];
  /**
   * Les pièges de ce joueur, et eux seuls : un piège adverse est invisible jusqu'à son
   * déclenchement (décision du 2026-11-20, docs/design/rules.md section 4), où le
   * journal le révèle.
   */
  readonly traps: readonly Trap[];
  /** Les coups de la partie tels que ce joueur les a vus. */
  readonly journal: readonly JournalEntry[];
  /**
   * La composition de départ des deux camps et ce qui en a été pris. Seulement des
   * types, jamais une position : la composition adverse est révélée dès le début de la
   * partie (décision du 2026-11-20, docs/design/open-points.md 16), et ses pertes sont
   * des prises du joueur.
   */
  readonly rosters: Rosters;
  /** Coups joués depuis la dernière prise (`DrawClock.sinceCapture`). */
  readonly sinceCapture: number;
  /** Le seuil de la nulle sans prise, ou `null` sous un ruleset qui ne la déclare pas. */
  readonly noCaptureLimit: number | null;
}

/** Une pièce de la composition d'un camp. */
export interface RosterEntry {
  readonly kind: PieceKind;
  /** La pièce a été prise. */
  readonly taken: boolean;
}

export interface Rosters {
  readonly own: readonly RosterEntry[];
  readonly opponent: readonly RosterEntry[];
}

export function viewFor(state: GameState, knowledge: PlayerKnowledge): PlayerView {
  const player = knowledge.player;
  const ownPieces: Piece[] = [];
  const visibleEnemies: Piece[] = [];

  for (const piece of state.pieces.values()) {
    if (piece.owner === player) {
      ownPieces.push(piece);
    } else if (knowledge.visible.has(coordKey(piece.coord))) {
      visibleEnemies.push(piece);
    }
  }

  // `observe()` garde aussi en mémoire les adverses vus en ce moment, à leur position
  // courante : c'est ce qui en fera des fantômes dès qu'ils quitteront la vue. Tant
  // qu'ils sont visibles, ils ne sont pas des fantômes.
  const seenNow = new Set(visibleEnemies.map((piece) => piece.id));
  const ghosts = [...knowledge.remembered.values()].filter((ghost) => !seenNow.has(ghost.id));

  return {
    player,
    activePlayer: state.activePlayer,
    turn: state.turn,
    outcome: state.outcome,
    // Seulement pour le camp au trait : `legalActions` ne génère que pour lui, et la
    // liste de l'adversaire trahirait la position de ses pièces.
    legalActions: state.activePlayer === player ? legalActions(state) : [],
    // Hors de son tour, un roi n'est jamais menacé : le coup qui l'aurait exposé était
    // illégal. Ne le calculer qu'au trait évite aussi de le faire deux fois par coup.
    check:
      state.ruleset.rules.check &&
      state.outcome === null &&
      state.activePlayer === player &&
      isKingThreatened(state, player),
    visible: knowledge.visible,
    ownPieces,
    visibleEnemies,
    ghosts,
    traps: state.traps.filter((trap) => trap.owner === player),
    journal: knowledge.journal,
    rosters: { own: rosterOf(state, player), opponent: rosterOf(state, opponentOf(player)) },
    sinceCapture: state.draw.sinceCapture,
    noCaptureLimit: state.ruleset.rules.draws?.withoutCapture ?? null,
  };
}

/**
 * La composition de départ d'un camp : ses pièces encore en jeu et celles que l'historique
 * dit prises, rangées par identifiant pour garder le même ordre d'un coup à l'autre.
 */
function rosterOf(state: GameState, owner: PlayerId): RosterEntry[] {
  const standing = [...state.pieces.values()]
    .filter((piece) => piece.owner === owner)
    .map((piece) => ({ id: piece.id, kind: piece.kind, taken: false }));
  const taken = state.history
    .flatMap((record) => [record.captured, record.trapped])
    .filter((piece): piece is Piece => piece !== undefined && piece.owner === owner)
    .map((piece) => ({ id: piece.id, kind: piece.kind, taken: true }));
  return [...standing, ...taken]
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map(({ kind, taken: isTaken }) => ({ kind, taken: isTaken }));
}

/**
 * Une partie et ce que chaque joueur en sait — l'unité que tient le Durable Object.
 *
 * La mémoire fantôme dépend de **toutes** les positions traversées, pas seulement de
 * la dernière : reconstruire une partie depuis son log suppose donc de faire avancer
 * la connaissance à chaque coup. Comme le serveur reconstruit à chaque réveil
 * (docs/architecture.md section 3), l'opération vit ici plutôt que d'être réécrite
 * à côté.
 */
export interface MatchMemory {
  readonly state: GameState;
  readonly knowledge: Record<PlayerId, PlayerKnowledge>;
}

export function startMemory(state: GameState): MatchMemory {
  return {
    state,
    knowledge: {
      A: observe(emptyKnowledge("A"), state),
      B: observe(emptyKnowledge("B"), state),
    },
  };
}

export function advanceMemory(
  memory: MatchMemory,
  action: Action,
): Result<MatchMemory, ActionError> {
  const played = applyAction(memory.state, action);
  if (!played.ok) return played;

  const state = played.value;
  return ok({
    state,
    knowledge: {
      A: advanceKnowledge(memory.knowledge.A, memory.state, state),
      B: advanceKnowledge(memory.knowledge.B, memory.state, state),
    },
  });
}

/** La connaissance d'un joueur après un coup : ce qu'il voit, et la ligne de journal. */
function advanceKnowledge(
  previous: PlayerKnowledge,
  before: GameState,
  after: GameState,
): PlayerKnowledge {
  const next = observe(previous, after);
  const entry = journalEntryFor({
    observer: previous.player,
    before,
    after,
    seenBefore: previous.visible,
    seenAfter: next.visible,
  });
  return entry === undefined ? next : { ...next, journal: [...previous.journal, entry] };
}

/** Rejoue un log en faisant avancer la mémoire des deux joueurs à chaque position. */
export function replayMemory(
  initial: GameState,
  log: readonly Action[],
): Result<MatchMemory, ReplayError> {
  let memory = startMemory(initial);
  for (const [seq, action] of log.entries()) {
    const advanced = advanceMemory(memory, action);
    if (!advanced.ok) return err({ ...advanced.error, seq });
    memory = advanced.value;
  }
  return ok(memory);
}
