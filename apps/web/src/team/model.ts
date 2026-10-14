import {
  type Coord,
  type PieceKind,
  type PieceRole,
  type Result,
  type Ruleset,
  type TeamEntry,
  type TeamError,
  coordEquals,
  coordKey,
  validateTeam,
} from "@occulis/core";

/**
 * Le brouillon d'une équipe, sans DOM ni réseau : des emplacements fixés par la
 * composition du ruleset (une maîtresse, des pièces à capacité, des pions), chacun avec
 * son type et sa case. Le constructeur d'équipe (`TeamBuilder.tsx`) ne fait que
 * l'afficher et lui transmettre les clics.
 *
 * **La validité n'est jamais redéduite ici** : elle vient de `validateTeam()` de
 * `@occulis/core`, la règle même que le serveur applique — comme `game/selection.ts`
 * filtre `legalActions` sans recalculer la légalité.
 */
export interface Slot {
  readonly role: PieceRole;
  readonly kind: PieceKind;
  readonly coord: Coord | undefined;
}

export interface TeamDraft {
  readonly slots: readonly Slot[];
  /** L'emplacement que le prochain clic sur une case posera. */
  readonly selected: number | undefined;
}

const ROLES: readonly PieceRole[] = ["commander", "special", "pawn"];

/** Les emplacements vides d'une équipe, dans l'ordre maîtresse, capacités, pions. */
export function emptyDraft(ruleset: Ruleset): TeamDraft {
  const rules = ruleset.team;
  const slots: Slot[] = [];
  if (rules !== null) {
    for (const role of ROLES) {
      const kind = ruleset.kindsOf(role)[0];
      if (kind === undefined) continue;
      for (let n = 0; n < rules[role]; n += 1) slots.push({ role, kind, coord: undefined });
    }
  }
  return { slots, selected: slots.length > 0 ? 0 : undefined };
}

/**
 * Un brouillon rempli depuis une équipe (un preset, l'équipe par défaut) : chaque entrée
 * prend le premier emplacement libre de son rôle. Ce qui ne trouve pas de place — type
 * inconnu, rôle déjà plein — est ignoré, et le brouillon reste à compléter.
 */
export function fromEntries(ruleset: Ruleset, entries: readonly TeamEntry[]): TeamDraft {
  const slots = [...emptyDraft(ruleset).slots];
  const filled = new Set<number>();
  for (const entry of entries) {
    if (!ruleset.has(entry.kind)) continue;
    const role = ruleset.get(entry.kind).role;
    const index = slots.findIndex((slot, i) => slot.role === role && !filled.has(i));
    if (index < 0) continue;
    filled.add(index);
    slots[index] = { role, kind: entry.kind, coord: entry.coord };
  }
  return { slots, selected: firstUnplaced(slots) };
}

export function select(draft: TeamDraft, index: number | undefined): TeamDraft {
  return { ...draft, selected: index !== undefined && draft.slots[index] !== undefined ? index : undefined };
}

/** Change le type d'un emplacement — parmi ceux de son rôle seulement. */
export function setKind(draft: TeamDraft, ruleset: Ruleset, index: number, kind: PieceKind): TeamDraft {
  const slot = draft.slots[index];
  if (slot === undefined || !ruleset.has(kind) || ruleset.get(kind).role !== slot.role) return draft;
  return { ...draft, slots: draft.slots.map((other, i) => (i === index ? { ...other, kind } : other)) };
}

/** L'emplacement posé sur `coord`, s'il y en a un. */
export function slotAt(draft: TeamDraft, coord: Coord): number | undefined {
  const index = draft.slots.findIndex((slot) => slot.coord !== undefined && coordEquals(slot.coord, coord));
  return index < 0 ? undefined : index;
}

/**
 * Un clic sur une case :
 * - sur une pièce posée, sans autre pièce en main (ou sur celle en main) : on la prend ;
 * - avec une pièce en main, sur une case de la zone : on l'y pose — en **échangeant** avec
 *   celle qui s'y trouvait, qui prend l'ancienne place (ou repart en main si elle n'en avait
 *   pas) — puis on prend en main le prochain emplacement vide ;
 * - ailleurs : rien.
 */
export function clickTile(draft: TeamDraft, coord: Coord, zone: readonly Coord[]): TeamDraft {
  const occupant = slotAt(draft, coord);
  if (occupant !== undefined && (draft.selected === undefined || draft.selected === occupant)) {
    return { ...draft, selected: occupant };
  }
  if (draft.selected === undefined || !zone.some((tile) => coordEquals(tile, coord))) return draft;

  const moving = draft.slots[draft.selected];
  if (moving === undefined) return draft;
  const slots = draft.slots.map((slot, i) => {
    if (i === draft.selected) return { ...slot, coord };
    if (i === occupant) return { ...slot, coord: moving.coord };
    return slot;
  });
  return { slots, selected: firstUnplaced(slots) ?? (occupant !== undefined && moving.coord === undefined ? occupant : undefined) };
}

/** Reprend une pièce posée : son emplacement redevient vide, et en main. */
export function remove(draft: TeamDraft, index: number): TeamDraft {
  if (draft.slots[index] === undefined) return draft;
  return { slots: draft.slots.map((slot, i) => (i === index ? { ...slot, coord: undefined } : slot)), selected: index };
}

/** Retire toutes les pièces, en gardant les types choisis. */
export function clear(draft: TeamDraft): TeamDraft {
  const slots = draft.slots.map((slot) => ({ ...slot, coord: undefined }));
  return { slots, selected: slots.length > 0 ? 0 : undefined };
}

/** Pose les emplacements vides sur les cases libres de la zone, dans l'ordre de la zone. */
export function autoFill(draft: TeamDraft, zone: readonly Coord[]): TeamDraft {
  const taken = new Set(draft.slots.flatMap((slot) => (slot.coord === undefined ? [] : [coordKey(slot.coord)])));
  const free = zone.filter((tile) => !taken.has(coordKey(tile)));
  let next = 0;
  const slots = draft.slots.map((slot) => {
    if (slot.coord !== undefined) return slot;
    const tile = free[next];
    next += 1;
    return tile === undefined ? slot : { ...slot, coord: tile };
  });
  return { slots, selected: firstUnplaced(slots) };
}

export function placedCount(draft: TeamDraft): number {
  return draft.slots.filter((slot) => slot.coord !== undefined).length;
}

export function isComplete(draft: TeamDraft): boolean {
  return draft.slots.length > 0 && placedCount(draft) === draft.slots.length;
}

/** Les pièces posées, dans l'ordre des emplacements : ce qui part au serveur. */
export function toEntries(draft: TeamDraft): TeamEntry[] {
  return draft.slots.flatMap((slot) => (slot.coord === undefined ? [] : [{ kind: slot.kind, coord: slot.coord }]));
}

/** Le verdict de la règle sur le brouillon — `validateTeam()`, sans rien y ajouter. */
export function verdict(ruleset: Ruleset, zone: readonly Coord[], draft: TeamDraft): Result<readonly TeamEntry[], TeamError> {
  return validateTeam(ruleset, zone, toEntries(draft));
}

function firstUnplaced(slots: readonly Slot[]): number | undefined {
  const index = slots.findIndex((slot) => slot.coord === undefined);
  return index < 0 ? undefined : index;
}
