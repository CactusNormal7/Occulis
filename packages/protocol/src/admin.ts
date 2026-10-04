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

export interface AdminMatchDetail extends AdminMatchSummary {
  /** Le log tel qu'il est rejoué, dans l'ordre de `seq`. */
  readonly log: readonly AdminLogEntry[];
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
