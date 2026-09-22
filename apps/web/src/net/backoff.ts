/**
 * Délai avant la n-ième tentative de reconnexion, en millisecondes.
 *
 * Croissance exponentielle bornée : le pilier « temps de réflexion illimité »
 * (docs/design.md section 2) rend une partie potentiellement très longue, donc une
 * coupure réseau y est un incident ordinaire dont on doit se relever sans harceler le
 * serveur. Le plafond garde une reprise rapide quand le réseau revient.
 *
 * Déterministe et sans horloge : c'est ce qui la rend testable, et le seul aléa utile
 * ici — désynchroniser des clients qui reviendraient tous ensemble — n'a pas lieu
 * d'être à cette échelle.
 */
export const FIRST_RETRY_MS = 500;
export const MAX_RETRY_MS = 15_000;

export function retryDelay(attempt: number): number {
  if (attempt < 1) return FIRST_RETRY_MS;
  return Math.min(FIRST_RETRY_MS * 2 ** (attempt - 1), MAX_RETRY_MS);
}
