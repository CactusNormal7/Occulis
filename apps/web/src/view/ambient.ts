/**
 * Les poussières en suspension au-dessus du plateau. Module pur : ni PixiJS, ni DOM.
 *
 * Purement décoratives, elles ne portent aucune information de partie et ne lisent
 * aucun état : elles dérivent d'une graine, et leur position est une fonction du temps
 * seul. Le client n'a donc rien à faire évoluer image par image, et une même graine
 * redonne la même nuée.
 */

export interface Mote {
  /** Position de départ, en fraction de l'écran. */
  readonly x: number;
  readonly y: number;
  /** Montée, en fraction de l'écran par seconde. */
  readonly rise: number;
  /** Amplitude de la dérive latérale, en fraction de l'écran. */
  readonly sway: number;
  readonly phase: number;
  /** Côté, en pixels du plateau. */
  readonly size: 1 | 2;
  readonly alpha: number;
}

export interface MoteAt {
  readonly x: number;
  readonly y: number;
  readonly alpha: number;
}

/** L'incrément de mulberry32, en décimal : un littéral hexadécimal se lirait comme une couleur. */
const MULBERRY_STEP = 1831565813;

/** Générateur pseudo-aléatoire à graine (mulberry32) : la nuée est reproductible. */
function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + MULBERRY_STEP) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createMotes(count: number, seed: number): Mote[] {
  const next = random(seed);
  return Array.from({ length: count }, () => ({
    x: next(),
    y: next(),
    rise: 0.004 + next() * 0.012,
    sway: 0.004 + next() * 0.012,
    phase: next() * Math.PI * 2,
    size: next() < 0.18 ? 2 : 1,
    alpha: 0.12 + next() * 0.4,
  }));
}

/**
 * Où est une poussière à l'instant `timeMs`, sur un écran de `width × height`. Elle
 * monte, ondule, scintille, et revient par le bas une fois sortie par le haut.
 */
export function moteAt(mote: Mote, timeMs: number, width: number, height: number): MoteAt {
  const seconds = timeMs / 1000;
  const y = (((mote.y - mote.rise * seconds) % 1) + 1) % 1;
  const x = mote.x + mote.sway * Math.sin(seconds * 0.6 + mote.phase);
  const twinkle = 0.55 + 0.45 * Math.sin(seconds * 1.3 + mote.phase * 3);
  // Elles s'éteignent en approchant des bords haut et bas plutôt que d'y disparaître net.
  const edge = Math.min(1, y * 6, (1 - y) * 6);
  return { x: x * width, y: y * height, alpha: mote.alpha * twinkle * edge };
}
