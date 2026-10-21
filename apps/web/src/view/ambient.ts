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

/**
 * Une luciole : elle erre sur place plutôt que de monter, et son éclat pulse lentement,
 * parfois jusqu'à s'éteindre — elle se rallume ailleurs dans sa ronde.
 */
export function fireflyAt(mote: Mote, timeMs: number, width: number, height: number): MoteAt {
  const seconds = timeMs / 1000;
  const x = mote.x + mote.sway * 2.2 * Math.sin(seconds * 0.23 + mote.phase);
  const y = mote.y + mote.sway * 1.6 * Math.sin(seconds * 0.31 + mote.phase * 2);
  const glow = Math.max(0, Math.sin(seconds * 0.9 + mote.phase * 5));
  return {
    x: (((x % 1) + 1) % 1) * width,
    y: (((y % 1) + 1) % 1) * height,
    alpha: (0.25 + 0.75 * mote.alpha) * glow,
  };
}

export interface Star {
  readonly x: number;
  readonly y: number;
  readonly size: 1 | 2;
  readonly alpha: number;
  readonly phase: number;
  /** Vitesse du scintillement, en radians par seconde. */
  readonly speed: number;
}

/**
 * La voûte : des étoiles d'un pixel, quelques-unes de deux, la plupart pâles. Comme les
 * poussières, une fonction de la graine seule.
 */
export function createStars(count: number, seed: number): Star[] {
  const next = random(seed);
  return Array.from({ length: count }, () => {
    const bright = next();
    return {
      x: next(),
      y: next(),
      size: bright > 0.94 ? 2 : 1,
      alpha: 0.12 + bright ** 3 * 0.75,
      phase: next() * Math.PI * 2,
      speed: 0.4 + next() * 1.6,
    };
  });
}

/** L'éclat d'une étoile à l'instant `timeMs` : un scintillement doux autour de son éclat propre. */
export function starAlpha(star: Star, timeMs: number): number {
  return star.alpha * (0.6 + 0.4 * Math.sin((timeMs / 1000) * star.speed + star.phase));
}

/**
 * Les constellations : chacune des étoiles les plus vives est reliée à sa plus proche
 * voisine vive, si elle est assez près. Les indices renvoyés désignent `stars`.
 */
export function constellationsOf(stars: readonly Star[], reach: number): [number, number][] {
  const bright = stars.map((star, i) => ({ star, i })).filter(({ star }) => star.alpha > 0.35);
  const links: [number, number][] = [];
  for (const { star, i } of bright) {
    let best: number | undefined;
    let bestDistance = reach;
    for (const other of bright) {
      if (other.i === i) continue;
      const distance = Math.hypot(other.star.x - star.x, other.star.y - star.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = other.i;
      }
    }
    if (
      best !== undefined &&
      !links.some(([a, b]) => (a === best && b === i) || (a === i && b === best))
    ) {
      links.push([i, best]);
    }
  }
  return links;
}

export interface ShootingStar {
  readonly x: number;
  readonly y: number;
  /** La traîne, du point de tête vers l'arrière. */
  readonly tailX: number;
  readonly tailY: number;
  readonly alpha: number;
}

/**
 * Une étoile filante par période, à un instant et un endroit tirés de la graine et du
 * numéro de la période : rare, imprévisible à l'œil, reproductible au calcul.
 */
export function shootingStarAt(
  timeMs: number,
  width: number,
  height: number,
  periodMs: number,
  seed: number,
): ShootingStar | undefined {
  const index = Math.floor(timeMs / periodMs);
  const next = random(seed + index * 7919);
  const offset = next() * periodMs * 0.6;
  const duration = 700 + next() * 500;
  const t = (timeMs - index * periodMs - offset) / duration;
  if (t < 0 || t > 1) return undefined;
  const startX = (0.15 + next() * 0.8) * width;
  const startY = next() * height * 0.45;
  const length = (0.18 + next() * 0.15) * width;
  const angle = Math.PI * (0.78 + next() * 0.12);
  const headX = startX + Math.cos(angle) * length * t;
  const headY = startY + Math.sin(angle) * length * t;
  const tail = Math.min(t, 0.35) * length * 0.6;
  return {
    x: headX,
    y: headY,
    tailX: headX - Math.cos(angle) * tail,
    tailY: headY - Math.sin(angle) * tail,
    alpha: Math.sin(Math.PI * t),
  };
}
