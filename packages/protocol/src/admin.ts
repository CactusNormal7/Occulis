/**
 * Les réponses des routes `/api/admin/*` du back-office.
 *
 * Seules les données de partie sont ici : les comptes passent par les routes du greffon
 * `admin` de Better Auth (`/api/auth/admin/*`), dont le format appartient à la
 * bibliothèque. Les horodatages sont en millisecondes, comme dans `matches` et `players`.
 */
import type { Action, Outcome, PlayerId } from "@occulis/core";

export interface AdminStats {
  readonly users: number;
  readonly verifiedUsers: number;
  readonly bannedUsers: number;
  readonly admins: number;
  /** Profils de jeu, dont ceux créés sans compte par `POST /api/matches`. */
  readonly players: number;
  readonly matches: number;
  readonly ongoingMatches: number;
  readonly actions: number;
  readonly matchesLastWeek: number;
  readonly signupsLastWeek: number;
}

export interface AdminPlayerRef {
  readonly id: string;
  readonly handle: string;
}

export interface AdminMatchSummary {
  readonly id: string;
  /** Le siège A est joué par `playerA`, le B par `playerB` (`match-setup.ts`). */
  readonly playerA: AdminPlayerRef;
  readonly playerB: AdminPlayerRef;
  readonly rulesetVersion: string;
  readonly scenario: string;
  readonly startedAt: number;
  readonly finishedAt: number | null;
  readonly outcome: Outcome | null;
  /** Nombre de lignes du log, abandon compris. */
  readonly actions: number;
}

export interface AdminMatchPage {
  readonly matches: readonly AdminMatchSummary[];
  readonly total: number;
}

export interface AdminLogEntry {
  readonly seq: number;
  /** Le camp qui a joué ce coup, connu par rejeu ; `null` au-delà d'un log illisible. */
  readonly player: PlayerId | null;
  readonly action: Action;
}

/** Une pièce telle qu'elle se tient dans une image de la partie. */
export interface AdminFramePiece {
  readonly id: string;
  readonly kind: string;
  readonly owner: PlayerId;
  readonly x: number;
  readonly y: number;
}

/**
 * La position **complète** à un instant de la partie, et ce que chaque camp en voyait.
 * Réservée au back-office : c'est exactement ce que le serveur ne transmet jamais à un
 * joueur (les pièces hors de sa LOS).
 */
export interface AdminFrame {
  readonly pieces: readonly AdminFramePiece[];
  /** Les cases dans la ligne de vue de chaque camp, en clés `x,y` (`coordKey`). */
  readonly visible: { readonly A: readonly string[]; readonly B: readonly string[] };
}

export interface AdminMatchDetail extends AdminMatchSummary {
  /** Le log tel qu'il est rejoué, dans l'ordre de `seq`. */
  readonly log: readonly AdminLogEntry[];
  /**
   * `frames[0]` est la position de départ, `frames[n + 1]` celle qui suit le coup `n`.
   * S'arrête au coup que le rejeu n'a pas su appliquer.
   */
  readonly frames: readonly AdminFrame[];
  /** Le coup où le rejeu échoue, et pourquoi — un log corrompu, ou un ruleset retiré. */
  readonly replayError: string | null;
}

export interface AdminPlayer {
  readonly id: string;
  readonly handle: string;
  readonly elo: number;
  readonly createdAt: number;
  /** Absent pour un profil créé sans compte. */
  readonly userId: string | null;
  readonly record: {
    readonly played: number;
    readonly won: number;
    readonly lost: number;
    readonly ongoing: number;
  };
}
