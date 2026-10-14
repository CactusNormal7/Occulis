/**
 * Les faits d'armes : des distinctions que le jeu décerne à partir des parties jouées, et
 * qu'un joueur exhibe sur sa carte (trois au plus) — vues de l'adversaire à l'annonce de
 * la partie.
 *
 * Le déblocage n'est **jamais stocké** : il se recalcule depuis les parties, la source de
 * vérité, et ne peut donc ni se perdre ni s'écrire à la main. Seul le choix des faits
 * exhibés l'est (`players.showcase`). Le serveur ne connaît que les identifiants ; leurs
 * noms et descriptions vivent dans le domaine `feats` de `@occulis/i18n`.
 *
 * Un socle volontairement simple — compter, enchaîner, monter : d'autres faits viendront
 * avec le roster et les fins de partie (docs/design.md points ouverts 12 et 13).
 */
export interface PlayerStats {
  /** Parties terminées. */
  readonly played: number;
  readonly won: number;
  readonly lost: number;
  /** La plus longue suite de victoires consécutives, parties terminées seulement. */
  readonly bestStreak: number;
  readonly rating: number;
}

export const FEAT_IDS = [
  "first-match",
  "first-win",
  "matches-10",
  "matches-50",
  "wins-10",
  "streak-3",
  "streak-5",
  "rating-1400",
] as const;

export type FeatId = (typeof FEAT_IDS)[number];

const RULES: Readonly<Record<FeatId, (stats: PlayerStats) => boolean>> = {
  "first-match": (s) => s.played >= 1,
  "first-win": (s) => s.won >= 1,
  "matches-10": (s) => s.played >= 10,
  "matches-50": (s) => s.played >= 50,
  "wins-10": (s) => s.won >= 10,
  "streak-3": (s) => s.bestStreak >= 3,
  "streak-5": (s) => s.bestStreak >= 5,
  "rating-1400": (s) => s.rating >= 1400,
};

/** Combien de faits un joueur peut exhiber à la fois. */
export const SHOWCASE_SIZE = 3;

export function isFeatId(value: unknown): value is FeatId {
  return typeof value === "string" && (FEAT_IDS as readonly string[]).includes(value);
}

/** Les faits débloqués, dans l'ordre du catalogue. */
export function unlockedFeats(stats: PlayerStats): FeatId[] {
  return FEAT_IDS.filter((id) => RULES[id](stats));
}

/**
 * Le choix d'exhibition tel qu'il s'affiche : ce qui n'est pas (ou plus) débloqué en
 * est retiré, comme un identifiant inconnu d'une ligne ancienne. Le choix enregistré
 * n'est jamais réécrit pour autant.
 */
export function shownFeats(showcase: unknown, unlocked: readonly FeatId[]): FeatId[] {
  if (!Array.isArray(showcase)) return [];
  const open = new Set(unlocked);
  return [...new Set(showcase as unknown[])].filter((id): id is FeatId => isFeatId(id) && open.has(id)).slice(0, SHOWCASE_SIZE);
}
