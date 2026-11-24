import {
  type Coord,
  type JournalEntry,
  type Piece,
  type PieceKind,
  type PlayerId,
  type PlayerView,
  coordEquals,
  coordKey,
} from "@occulis/core";

/**
 * Ce qu'une nouvelle vue apprend au joueur sur les pièges. Module pur : ni PixiJS, ni DOM.
 *
 * Comme `movement-diff.ts`, il lit la différence entre deux vues successives du serveur,
 * et rien d'autre : il ne révèle donc jamais un piège que la vue ne montre pas. La scène
 * en tire ses effets (`render/pixi/scene.ts`), le contrôleur un bandeau
 * (`app/match-controller.ts`).
 */
export type TrapEvent =
  /** Le joueur vient de poser un piège : il est seul à le voir. */
  | { readonly kind: "laid"; readonly coord: Coord; readonly owner: PlayerId }
  /**
   * L'adversaire a exercé sa capacité sous les yeux du joueur. Seule la case de la pièce
   * est connue, jamais celle du piège.
   */
  | { readonly kind: "glimpsed"; readonly coord: Coord; readonly owner: PlayerId }
  /** Une pièce s'est arrêtée sur un piège et a été prise : les deux camps le savent. */
  | { readonly kind: "sprung"; readonly coord: Coord; readonly victim: TrapVictim };

/**
 * La pièce prise au piège, telle que le joueur la connaissait. `from` est sa case
 * d'avant le coup, si le joueur la voyait : la scène la fait alors marcher jusqu'au piège
 * avant de la faire happer, au lieu de la faire disparaître.
 */
export interface TrapVictim {
  readonly id: string | undefined;
  readonly kind: PieceKind;
  readonly owner: PlayerId;
  readonly from: Coord | undefined;
}

export function trapEventsBetween(before: PlayerView, after: PlayerView): TrapEvent[] {
  const events: TrapEvent[] = [];
  const known = new Set(before.traps.map((trap) => coordKey(trap.coord)));
  for (const trap of after.traps) {
    if (!known.has(coordKey(trap.coord))) {
      events.push({ kind: "laid", coord: trap.coord, owner: trap.owner });
    }
  }

  for (const entry of after.journal.slice(before.journal.length)) {
    if (entry.ability !== undefined && entry.target === undefined && entry.from !== undefined) {
      events.push({ kind: "glimpsed", coord: entry.from, owner: entry.player });
    }
    if (entry.trapped !== undefined && entry.to !== undefined) {
      events.push({ kind: "sprung", coord: entry.to, victim: victimOf(before, after, entry) });
    }
  }
  return events;
}

/**
 * Retrouve dans la vue d'avant la pièce que le journal dit prise au piège : une pièce
 * du camp qui a joué, de ce type, absente de la vue d'après — sur la case de départ
 * quand le journal la donne.
 */
function victimOf(before: PlayerView, after: PlayerView, entry: JournalEntry): TrapVictim {
  const kind = entry.trapped ?? "";
  const stillThere = new Set([...after.ownPieces, ...after.visibleEnemies].map((p) => p.id));
  const candidates: Piece[] = [...before.ownPieces, ...before.visibleEnemies].filter(
    (piece) =>
      piece.owner === entry.player &&
      piece.kind === kind &&
      !stillThere.has(piece.id) &&
      (entry.from === undefined || coordEquals(piece.coord, entry.from)),
  );
  const piece = candidates[0];
  return { id: piece?.id, kind, owner: entry.player, from: piece?.coord ?? entry.from };
}
