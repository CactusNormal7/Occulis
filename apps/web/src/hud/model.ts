import type {
  Board,
  Coord,
  JournalEntry,
  PieceKind,
  PlayerId,
  PlayerView,
  RosterEntry,
} from "@occulis/core";
import type { Messages } from "@occulis/i18n";
import type { PieceSheet } from "../game/inspection.js";
import type { Selection } from "../game/selection.js";
import type { TrapEvent } from "../game/trap-events.js";
import type { MatchPlayers } from "../net/session.js";
import { describeSheet } from "../ui/piece-info-model.js";

/**
 * Ce que montre l'ATH de partie (disposition « Bandeaux », docs/mockups/ath/a-bandeaux.html).
 * Module pur : il traduit l'état de la partie en textes et en drapeaux, et les composants de
 * `hud/` n'ont plus qu'à les poser. Toute décision d'affichage vit ici, et ses tests avec.
 */

/**
 * Le compteur de nulle sans prise ne paraît que dans les `DRAW_WARNING_MARGIN` dernières
 * actions avant le seuil (à partir de 40 sur 60) : avant, il n'apprend rien au joueur.
 */
export const DRAW_WARNING_MARGIN = 20;

/** Le journal ne garde à l'écran que les derniers coups ; la colonne n'en montre pas plus. */
export const JOURNAL_LENGTH = 40;

/** Ce que l'ATH lit de la partie en cours. */
export interface HudInput {
  /** La vue du camp affiché : celui du joueur, ou celui de l'ami regardé. */
  readonly view: PlayerView;
  readonly board: Board;
  /** Le pseudo de l'ami regardé ; absent pour un joueur. */
  readonly watching: string | undefined;
  /** Les plaques des deux camps, absentes jusqu'au message `players`. */
  readonly players: MatchPlayers | undefined;
  readonly opponentAway: boolean;
  /** Un coup envoyé attend la réponse du serveur. */
  readonly pending: boolean;
  readonly selection: Selection | undefined;
  /** La pièce décrite dans la colonne : celle d'un clic droit, sinon la pièce sélectionnée. */
  readonly sheet: PieceSheet | undefined;
}

export interface HudModel {
  readonly spectating: boolean;
  readonly self: PlayerBand;
  readonly opponent: PlayerBand;
  readonly turn: TurnPlate;
  /** Le roi du camp affiché est en échec : l'alerte sous le tour. */
  readonly check: boolean;
  readonly sheet: SheetCard | undefined;
  readonly journal: readonly JournalLine[];
  readonly drawMeter: DrawMeter | undefined;
  /** La légende des lueurs, utile seulement quand le plateau en montre. */
  readonly showLegend: boolean;
}

/** La plaque d'un camp, en haut de l'écran. */
export interface PlayerBand {
  readonly camp: PlayerId;
  readonly name: string;
  readonly elo: string | undefined;
  readonly offline: boolean;
  /** Le camp est au trait : sa plaque s'allume de sa couleur. */
  readonly toMove: boolean;
  readonly rosterLabel: string;
  readonly roster: readonly RosterSlot[];
}

export interface RosterSlot {
  readonly kind: PieceKind;
  /** Le nom de la pièce, et sa perte : l'icône seule ne dit rien à un lecteur d'écran. */
  readonly label: string;
  readonly taken: boolean;
}

export interface TurnPlate {
  /** Le numéro du coup à jouer, ou du dernier joué si la partie est finie. */
  readonly number: number;
  readonly line: string;
  /** `yours` : le camp affiché est au trait ; `check` : il l'est, roi menacé. */
  readonly tone: "yours" | "check" | "waiting";
}

export interface SheetCard {
  readonly kind: PieceKind;
  readonly camp: PlayerId;
  /** Un fantôme : la pièce est dessinée pâle, comme sur le plateau. */
  readonly ghost: boolean;
  readonly title: string;
  /** À qui elle est, où, et à quelle hauteur. */
  readonly place: string;
  readonly alert: string | undefined;
  readonly description: string | undefined;
  readonly facts: readonly { readonly label: string; readonly value: string }[];
  readonly notes: readonly string[];
  /** Ce que la pièce sélectionnée peut faire ce tour-ci ; absent pour une simple fiche. */
  readonly reach: SheetReach | undefined;
  /** Le bouton de la capacité de la pièce sélectionnée ; absent si elle n'en a pas. */
  readonly ability: SheetAbility | undefined;
}

export interface SheetReach {
  readonly moves: string;
  readonly captures: string | undefined;
  /** Les cases de piège, quand la capacité est armée. */
  readonly traps: string | undefined;
}

/**
 * La capacité de la pièce sélectionnée. Le bouton l'arme ou la désarme ; il est absent
 * quand la capacité n'a aucune cible ce tour-ci, et `blocked` dit alors pourquoi.
 */
export interface SheetAbility {
  readonly aiming: boolean;
  /** Le texte du bouton : armer, ou revenir aux déplacements. */
  readonly action: string | undefined;
  /** Ce qu'il faut faire une fois armée. */
  readonly hint: string | undefined;
  readonly blocked: string | undefined;
}

export interface JournalLine {
  readonly turn: number;
  readonly camp: PlayerId;
  readonly text: string;
  /** Un coup dont le joueur n'a rien vu : la ligne s'efface. */
  readonly hidden: boolean;
  /** Le dernier coup joué, écrit en clair. */
  readonly last: boolean;
  /** Le coup à venir, en pointillés. */
  readonly upcoming: boolean;
}

export interface DrawMeter {
  readonly count: string;
  /** La part du seuil atteinte, entre 0 et 1. */
  readonly share: number;
  readonly title: string;
  readonly rule: string;
}

type HudMessages = Pick<Messages, "game" | "team">;

export function hudModel(m: HudMessages, input: HudInput): HudModel {
  const { view } = input;
  const spectating = input.watching !== undefined;
  const self = selfBand(m, input);
  const opponent = opponentBand(m, input);
  return {
    spectating,
    self,
    opponent,
    turn: turnPlate(m, input, self, opponent),
    check: view.check && view.outcome === null,
    sheet: input.sheet === undefined ? undefined : sheetCard(m, input, input.sheet),
    journal: journalLines(m, view),
    drawMeter: drawMeter(m, view),
    showLegend: input.selection !== undefined && !spectating,
  };
}

// ── Plaques ─────────────────────────────────────────────────────────────────────────

function selfBand(m: HudMessages, input: HudInput): PlayerBand {
  const { view, players, watching } = input;
  return {
    camp: view.player,
    // Un spectateur suit son ami : la plaque du bas de l'écran porte son nom, pas « Vous ».
    name: watching ?? m.game.hud.you,
    elo: players === undefined ? undefined : m.game.hud.elo(players.self.elo),
    offline: false,
    toMove: view.outcome === null && view.activePlayer === view.player,
    rosterLabel: m.game.hud.ownPieces,
    roster: rosterSlots(m, view.rosters.own),
  };
}

function opponentBand(m: HudMessages, input: HudInput): PlayerBand {
  const { view, players } = input;
  const camp: PlayerId = view.player === "A" ? "B" : "A";
  return {
    camp,
    name: players?.opponent.handle ?? m.game.hud.opponent,
    elo: players === undefined ? undefined : m.game.hud.elo(players.opponent.elo),
    offline: input.opponentAway,
    toMove: view.outcome === null && view.activePlayer === camp,
    rosterLabel: m.game.hud.opponentPieces,
    roster: rosterSlots(m, view.rosters.opponent),
  };
}

function rosterSlots(m: HudMessages, roster: readonly RosterEntry[]): RosterSlot[] {
  return roster.map((entry) => {
    const name = kindName(m, entry.kind);
    return {
      kind: entry.kind,
      label: entry.taken ? m.game.hud.taken(name) : name,
      taken: entry.taken,
    };
  });
}

// ── Tour ────────────────────────────────────────────────────────────────────────────

function turnPlate(
  m: HudMessages,
  input: HudInput,
  self: PlayerBand,
  opponent: PlayerBand,
): TurnPlate {
  const { view } = input;
  const t = m.game.hud;
  if (view.outcome !== null) return { number: view.turn, line: t.over, tone: "waiting" };

  const number = view.turn + 1;
  const mover = self.toMove ? self : opponent;
  if (input.watching !== undefined || !self.toMove) {
    return { number, line: t.toMove(mover.name), tone: "waiting" };
  }
  if (view.check) return { number, line: t.inCheck, tone: "check" };
  return { number, line: input.pending ? t.sent : t.yourMove, tone: "yours" };
}

// ── Fiche de pièce ──────────────────────────────────────────────────────────────────

function sheetCard(m: HudMessages, input: HudInput, sheet: PieceSheet): SheetCard {
  const texts = describeSheet(m, sheet);
  const coord = sheet.piece.coord;
  const height = input.board.getTile(coord)?.height ?? 0;
  const selected = input.selection;
  const isSelected = selected !== undefined && selected.piece.id === sheet.piece.id;
  return {
    kind: sheet.piece.kind,
    camp: sheet.piece.owner,
    ghost: sheet.relation === "ghost",
    title: texts.title,
    place: m.game.hud.where(texts.owner, formatCoord(coord), height),
    alert: texts.alert,
    description: texts.description,
    facts: texts.facts,
    notes: texts.notes,
    reach: isSelected ? reachOf(m, selected) : undefined,
    ability: isSelected && sheet.ability !== null ? abilityOf(m, input, selected) : undefined,
  };
}

/** Les coups de la pièce sélectionnée, par nature, dans les couleurs de leurs lueurs. */
function reachOf(m: HudMessages, selection: Selection): SheetReach {
  if (selection.aiming) {
    return {
      moves: m.game.hud.moves(0),
      captures: undefined,
      traps: m.game.hud.traps(selection.abilityTargets.size),
    };
  }
  const captures = selection.captures.size;
  return {
    moves: m.game.hud.moves(selection.moves.size - captures),
    captures: captures === 0 ? undefined : m.game.hud.captures(captures),
    traps: undefined,
  };
}

/**
 * Le bouton de la capacité. Une pièce sans cible n'a pas de bouton : si c'est parce que
 * son piège est encore posé, la fiche le dit, pour qu'elle ne semble pas en panne.
 */
function abilityOf(m: HudMessages, input: HudInput, selection: Selection): SheetAbility {
  const t = m.game.hud;
  const trapSet = input.view.traps.some((trap) => trap.layer === selection.piece.id);
  if (selection.abilityTargets.size === 0) {
    return {
      aiming: false,
      action: undefined,
      hint: undefined,
      blocked: trapSet ? t.trapActive : undefined,
    };
  }
  return {
    aiming: selection.aiming,
    action: selection.aiming ? t.cancelTrap : t.layTrap,
    hint: selection.aiming ? t.trapHint : undefined,
    blocked: undefined,
  };
}

// ── Journal ─────────────────────────────────────────────────────────────────────────

function journalLines(m: HudMessages, view: PlayerView): JournalLine[] {
  const played = view.journal.slice(-JOURNAL_LENGTH);
  const lines: JournalLine[] = played.map((entry, index) => ({
    turn: entry.turn,
    camp: entry.player,
    ...describeEntry(m, entry),
    last: index === played.length - 1,
    upcoming: false,
  }));
  if (view.outcome === null) {
    lines.push({
      turn: view.turn + 1,
      camp: view.activePlayer,
      text: "…",
      hidden: false,
      last: false,
      upcoming: true,
    });
  }
  return lines;
}

/**
 * Une ligne de journal dit ce que le joueur a vu du coup, et rien de plus : un `?` tient la
 * place de ce qu'il ignore (`JournalEntry`).
 */
export function describeEntry(
  m: HudMessages,
  entry: JournalEntry,
): { readonly text: string; readonly hidden: boolean } {
  const t = m.game.hud;
  if (entry.from === undefined && entry.to === undefined) return { text: t.unseen, hidden: true };

  if (entry.ability !== undefined) {
    const piece = entry.kind === undefined ? t.unknown : kindName(m, entry.kind);
    // Sa propre pose dit où ; celle de l'adversaire, seulement qu'il s'est passé quelque chose.
    if (entry.target !== undefined) {
      return { text: t.laysTrap(piece, formatCoord(entry.target)), hidden: false };
    }
    const from = entry.from === undefined ? t.unknown : formatCoord(entry.from);
    return { text: t.usesAbility(piece, from), hidden: false };
  }

  // Une pièce perdue sans rien voir venir : seule la perte est connue.
  if (entry.kind === undefined && entry.from === undefined && entry.captured !== undefined) {
    const at = entry.to === undefined ? t.unknown : formatCoord(entry.to);
    return { text: t.lost(kindName(m, entry.captured), at), hidden: false };
  }

  const piece = entry.kind === undefined ? t.unknown : kindName(m, entry.kind);
  const from = entry.from === undefined ? t.unknown : formatCoord(entry.from);
  const to = entry.to === undefined ? t.unknown : formatCoord(entry.to);
  const move = t.move(piece, from, to);
  const taking = entry.captured === undefined ? move : t.takes(move, kindName(m, entry.captured));
  return {
    text: entry.trapped === undefined ? taking : t.trapped(taking, kindName(m, entry.trapped)),
    hidden: false,
  };
}

/**
 * Le bandeau d'un piège déclenché : sans lui, la pièce disparaît du plateau sans que le
 * joueur sache pourquoi. `viewer` est le camp affiché ; `undefined` si rien n'a sauté.
 */
export function trapNotice(
  m: HudMessages,
  events: readonly TrapEvent[],
  viewer: PlayerId,
): string | undefined {
  const sprung = events.find((event) => event.kind === "sprung");
  if (sprung?.kind !== "sprung") return undefined;
  const piece = kindName(m, sprung.victim.kind);
  const at = formatCoord(sprung.coord);
  return sprung.victim.owner === viewer
    ? m.game.hud.caughtOwn(piece, at)
    : m.game.hud.caughtEnemy(piece, at);
}

// ── Nulle sans prise ────────────────────────────────────────────────────────────────

function drawMeter(m: HudMessages, view: PlayerView): DrawMeter | undefined {
  const limit = view.noCaptureLimit;
  if (limit === null || view.outcome !== null) return undefined;
  if (view.sinceCapture < limit - DRAW_WARNING_MARGIN) return undefined;
  return {
    count: m.game.hud.drawCount(view.sinceCapture, limit),
    share: Math.min(1, view.sinceCapture / limit),
    title: m.game.hud.drawNear,
    rule: m.game.hud.drawRule(limit),
  };
}

// ── Outils ──────────────────────────────────────────────────────────────────────────

function kindName(m: HudMessages, kind: PieceKind): string {
  return m.team.kinds[kind] ?? m.team.unknownKind(kind);
}

/** Une case comme le plateau et le journal l'écrivent : `x,y`. */
export function formatCoord(coord: Coord): string {
  return `${coord.x},${coord.y}`;
}
