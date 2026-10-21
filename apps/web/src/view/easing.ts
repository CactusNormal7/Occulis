/**
 * Les courbes d'animation du plateau. Module pur.
 *
 * Toutes partent de 0 et arrivent à 1 ; aucune ne procède par paliers. `easeOutBack`
 * dépasse légèrement sa cible avant de s'y poser : c'est la retombée d'un objet qui a du
 * poids.
 */

export function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

export function easeOutCubic(t: number): number {
  return 1 - (1 - clamp01(t)) ** 3;
}

export function easeInOutSine(t: number): number {
  return 0.5 - 0.5 * Math.cos(Math.PI * clamp01(t));
}

export function easeOutBack(t: number, overshoot = 1.7): number {
  const k = clamp01(t) - 1;
  return 1 + (overshoot + 1) * k ** 3 + overshoot * k ** 2;
}

/** La progression d'une animation qui commence à `start` et dure `duration`. */
export function phase(now: number, start: number, duration: number): number {
  return duration <= 0 ? 1 : clamp01((now - start) / duration);
}
