/**
 * Les réponses des routes `/api/me/*` : la page de profil, où un joueur consulte et gère
 * **son propre** compte.
 *
 * Le pendant des types `Admin*`, avec une différence de fond : rien ici ne dépasse ce que
 * le joueur savait déjà. Le replay d'une partie montre ce que **son** camp voyait, coup
 * par coup, et jamais la position complète — le fog s'applique aussi après la partie.
 * Les horodatages sont en millisecondes.
 */
import type { Action, Outcome, PlayerId } from "@occulis/core";

export interface MeProfile {
  readonly handle: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly createdAt: number;
  /** Le prochain changement de pseudo possible ; `null` s'il l'est dès maintenant. */
  readonly nextHandleChangeAt: number | null;
  /** Faux pour un compte créé par Google et qui n'a jamais défini de mot de passe. */
  readonly hasPassword: boolean;
  /** Les fournisseurs d'identité liés (`google`), hors mot de passe. */
  readonly providers: readonly string[];
  /** Les fournisseurs que ce serveur sait proposer, selon ses secrets. */
  readonly availableProviders: readonly string[];
  /** Session ouverte par un administrateur : la page est alors en lecture seule. */
  readonly impersonating: boolean;
  readonly record: MeRecord;
}

export interface MeRecord {
  readonly played: number;
  readonly won: number;
  readonly lost: number;
  readonly ongoing: number;
}

export interface MeSession {
  /** L'identifiant de ligne, jamais le jeton : celui-ci ne quitte pas le cookie. */
  readonly id: string;
  readonly current: boolean;
  readonly createdAt: number;
  readonly lastActiveAt: number;
  readonly expiresAt: number;
  readonly userAgent: string | null;
  readonly ipAddress: string | null;
  /** Ouverte par un administrateur à votre place (usurpation). */
  readonly impersonated: boolean;
}

export type MeResult = "won" | "lost" | "ongoing" | "ended";

export interface MeMatchSummary {
  readonly id: string;
  /** Le camp que vous teniez. */
  readonly seat: PlayerId;
  readonly opponent: string;
  readonly scenario: string;
  readonly rulesetVersion: string;
  readonly startedAt: number;
  readonly finishedAt: number | null;
  readonly outcome: Outcome | null;
  readonly result: MeResult;
  readonly actions: number;
}

export interface MeMatchPage {
  readonly matches: readonly MeMatchSummary[];
  readonly total: number;
}

export interface MeFramePiece {
  readonly id: string;
  readonly kind: string;
  readonly owner: PlayerId;
  readonly x: number;
  readonly y: number;
}

/** Ce que votre camp savait après un coup : exactement la vue reçue en partie. */
export interface MeFrame {
  /** Vos pièces et les pièces adverses dans votre ligne de vue. */
  readonly pieces: readonly MeFramePiece[];
  /** Les pièces adverses dont vous gardiez le souvenir hors de vue (mémoire fantôme). */
  readonly ghosts: readonly MeFramePiece[];
  readonly visible: readonly string[];
}

export interface MeLogEntry {
  readonly seq: number;
  readonly player: PlayerId | null;
  /**
   * Le coup, s'il est le vôtre. Celui de l'adversaire reste masqué : il nomme la pièce
   * et sa destination, donc révélerait des positions que vous n'avez jamais vues.
   */
  readonly action: Action | null;
}

export interface MeMatchDetail extends MeMatchSummary {
  readonly log: readonly MeLogEntry[];
  /** `frames[0]` est la position de départ, `frames[n + 1]` celle qui suit le coup `n`. */
  readonly frames: readonly MeFrame[];
  readonly replayError: string | null;
}
