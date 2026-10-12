/**
 * L'Elo, sous sa forme classique. Il ne bouge qu'à la clôture d'une partie **classée**
 * (file d'attente rapide) : une partie privée se joue entre gens qui se connaissent, et
 * deux comptes d'un même joueur suffiraient sinon à gonfler l'un d'eux.
 *
 * Départ à 1200 (la valeur par défaut de `players.elo`), K = 32 : les valeurs d'usage
 * pour une population jeune, choisies avec le porteur du projet. Aucun classement n'est
 * tiré de cette valeur (docs/design.md section 2, « pas de leaderboard ») : elle ne sert
 * qu'à situer un adversaire.
 */
export const INITIAL_RATING = 1200;
export const K_FACTOR = 32;

/** La probabilité de victoire de `a` contre `b` que prédit l'écart d'Elo. */
export function expectedScore(a: number, b: number): number {
  return 1 / (1 + 10 ** ((b - a) / 400));
}

/**
 * Les variations de chaque camp pour un résultat, `scoreA` valant 1 (victoire de A), 0
 * (défaite) ou ½ (nulle). Arrondies à l'entier, et **opposées** : ce que l'un gagne,
 * l'autre le perd, pour que la somme des Elo ne dérive pas.
 */
export function ratingChanges(a: number, b: number, scoreA: number, k = K_FACTOR): { readonly a: number; readonly b: number } {
  const change = Math.round(k * (scoreA - expectedScore(a, b)));
  return { a: change, b: -change };
}
