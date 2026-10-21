import { PROPOSED, isMotionLevel, type MotionLevel } from "../tokens.js";

/**
 * Le mouvement tel que la page le règle à l'instant : niveau d'intensité, amplitude et
 * tempo, lus sur les propriétés `--occ-*` de la racine. Une animation pilotée en
 * JavaScript (un glyphe qui se brouille, un front de papier, un saut de pièce) ne lit
 * jamais une durée en dur : elle passe par ici, et suit donc une surcharge posée à chaud
 * sur `:root` — depuis le back-office, un compte, ou le labo.
 *
 * Deux moitiés, comme `window-reveal.ts` : `motionFrom()` est pur et testé ; `readMotion()`
 * va chercher les valeurs dans le DOM.
 */

export interface Motion {
  readonly level: MotionLevel;
  /** Multiplie les distances parcourues : 1, 0,4, 0. */
  readonly amplitude: number;
  /** Multiplie les durées : 2 est deux fois plus lent. */
  readonly tempo: number;
}

export const DEFAULT_MOTION: Motion = { level: "full", amplitude: 1, tempo: 1 };

function positive(text: string | undefined, fallback: number): number {
  const value = Number.parseFloat(text ?? "");
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

/**
 * Le mouvement décrit par les valeurs brutes des propriétés. Une valeur absente ou
 * illisible retombe sur le défaut de son niveau : une surcharge mal formée ne fige ni
 * n'accélère jamais la page à l'infini.
 */
export function motionFrom(raw: { level?: string; amplitude?: string; tempo?: string }): Motion {
  const level = raw.level?.trim();
  const resolved: MotionLevel = isMotionLevel(level) ? level : "full";
  return {
    level: resolved,
    amplitude:
      resolved === "still" ? 0 : positive(raw.amplitude, PROPOSED.motion[resolved].amplitude),
    tempo: positive(raw.tempo, 1) || 1,
  };
}

/** Le mouvement en vigueur sur `element` (la racine du document par défaut). */
export function readMotion(element?: Element): Motion {
  if (typeof getComputedStyle !== "function" || typeof document === "undefined")
    return DEFAULT_MOTION;
  const style = getComputedStyle(element ?? document.documentElement);
  return motionFrom({
    level: style.getPropertyValue("--occ-motion-level"),
    amplitude: style.getPropertyValue("--occ-motion-amplitude"),
    tempo: style.getPropertyValue("--occ-tempo"),
  });
}

/** Une durée de rôle (`PROPOSED.duration`) en millisecondes, tempo compris. */
export function durationMs(role: keyof typeof PROPOSED.duration, motion: Motion): number {
  return PROPOSED.duration[role] * motion.tempo;
}

/** Une propriété numérique de la racine (`--occ-paper-speed`), ou `fallback`. */
export function readNumber(name: string, fallback: number, element?: Element): number {
  if (typeof getComputedStyle !== "function" || typeof document === "undefined") return fallback;
  const value = Number.parseFloat(
    getComputedStyle(element ?? document.documentElement).getPropertyValue(name),
  );
  return Number.isFinite(value) ? value : fallback;
}

/** Une propriété textuelle de la racine (`--occ-paper-resorb`), ou `fallback`. */
export function readText(name: string, fallback: string, element?: Element): string {
  if (typeof getComputedStyle !== "function" || typeof document === "undefined") return fallback;
  const value = getComputedStyle(element ?? document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value.length > 0 ? value : fallback;
}

/** `rgb(r g b)` ou `rgb(r g b / a)` — la forme de `cssColor()` — en composantes 0…1. */
export function parseRgb(text: string): [number, number, number] | undefined {
  const match = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(text);
  if (match === null) return undefined;
  return [Number(match[1]) / 255, Number(match[2]) / 255, Number(match[3]) / 255];
}

/**
 * La couleur résolue d'une propriété de rôle (`--occ-paper`), en composantes 0…1. Une
 * propriété de rôle renvoie à une autre (`var(--occ-ink)`) : seul un élément qui la
 * **porte** en couleur la résout, d'où la sonde.
 */
export function readColor(name: string, element: Element): [number, number, number] | undefined {
  if (typeof getComputedStyle !== "function" || typeof document === "undefined") return undefined;
  const probe = document.createElement("span");
  probe.style.color = `var(${name})`;
  probe.style.display = "none";
  element.append(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return parseRgb(color);
}

/**
 * Une courbe `cubic-bezier(x1, y1, x2, y2)` des tokens, en fonction de 0…1 vers 0…1 : la même
 * courbe pour une transition CSS et pour une animation tracée en JavaScript (un saut de pièce,
 * demain dans PixiJS). Une courbe illisible retombe sur la droite.
 */
export function easing(css: string): (t: number) => number {
  const match =
    /cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/.exec(css);
  if (match === null) return (t) => Math.min(1, Math.max(0, t));
  const [x1, y1, x2, y2] = match.slice(1, 5).map(Number) as [number, number, number, number];
  const at = (a: number, b: number, s: number): number =>
    3 * a * s * (1 - s) ** 2 + 3 * b * s ** 2 * (1 - s) + s ** 3;
  return (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    // Dichotomie sur le paramètre : monotone en x pour toute courbe CSS valide.
    let low = 0;
    let high = 1;
    for (let i = 0; i < 24; i += 1) {
      const mid = (low + high) / 2;
      if (at(x1, x2, mid) < t) low = mid;
      else high = mid;
    }
    return at(y1, y2, (low + high) / 2);
  };
}
