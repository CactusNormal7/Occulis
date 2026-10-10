/**
 * Les réponses des routes `/api/me/*` : la page de profil, où un joueur consulte et gère
 * **son propre** compte.
 *
 * Le pendant des types `Admin*`, avec une différence de fond : rien ici ne dépasse ce que
 * le joueur savait déjà. Le replay d'une partie montre ce que **son** camp voyait, coup
 * par coup, et jamais la position complète — le fog s'applique aussi après la partie.
 * Les horodatages sont en millisecondes.
 */
import type { Action, Outcome, PlayerId, TeamEntry } from "@occulis/core";

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
  /** L'Elo courant ; il ne bouge qu'avec les parties classées (file rapide). */
  readonly elo: number;
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
  /** Partie classée : elle a fait (ou fera) varier l'Elo. */
  readonly rated: boolean;
  /** Ce que la partie a fait gagner ou perdre d'Elo à votre camp ; `null` si non classée ou en cours. */
  readonly ratingChange: number | null;
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

/** Un fait d'armes du catalogue, et où vous en êtes. Ses textes sont côté client (`@occulis/i18n`, domaine `feats`). */
export interface MeFeat {
  readonly id: string;
  readonly unlocked: boolean;
}

export interface MeFeats {
  readonly feats: readonly MeFeat[];
  /** Les faits exhibés, dans l'ordre choisi ; trois au plus, tous débloqués. */
  readonly showcase: readonly string[];
}

/**
 * Une équipe préparée d'avance, pour une carte et un ruleset. Ses cases sont celles de
 * la zone du **camp A** : au déploiement, elles sont transposées vers la zone du camp
 * réellement tenu (`teamForSide()` de `@occulis/core`).
 */
export interface TeamPreset {
  readonly id: string;
  readonly name: string;
  readonly scenario: string;
  readonly rulesetVersion: string;
  readonly team: readonly TeamEntry[];
  readonly isDefault: boolean;
  /** Faux si l'équipe ne respecte plus les règles courantes : elle est gardée, pas utilisable. */
  readonly valid: boolean;
  readonly updatedAt: number;
}

export interface TeamPresetList {
  readonly presets: readonly TeamPreset[];
  /** La carte et le ruleset des nouvelles parties : ceux pour lesquels on prépare. */
  readonly scenario: string;
  readonly rulesetVersion: string;
  /** Combien de presets un joueur peut garder. */
  readonly limit: number;
}

export interface MeMatchDetail extends MeMatchSummary {
  readonly log: readonly MeLogEntry[];
  /** `frames[0]` est la position de départ, `frames[n + 1]` celle qui suit le coup `n`. */
  readonly frames: readonly MeFrame[];
  readonly replayError: string | null;
}
