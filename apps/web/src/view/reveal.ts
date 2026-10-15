import { type Coord, type CoordKey, chebyshevDistance } from "@occulis/core";
import { easeInOutSine } from "./easing.js";

/**
 * La lumière de chaque case, animée. Module pur : ni PixiJS, ni DOM.
 *
 * La ligne de vue ne bascule jamais d'un coup : quand elle change, chaque case passe de
 * son éclairage courant à l'éclairage visé, avec un retard proportionnel à sa distance
 * à la plus proche des pièces qui voient. La vue se **déploie** donc depuis les pièces,
 * en vague, et se retire d'un bloc. L'animation ne lit que ce que la vue transmise
 * contient déjà : elle ne révèle rien que le serveur n'ait envoyé.
 */

export interface Transition {
  /** Éclairage de départ et d'arrivée : 0 hors de vue, 1 en vue. */
  readonly from: number;
  readonly to: number;
  /** Instant où la transition commence, retard compris. */
  readonly start: number;
  readonly duration: number;
}

export type LightMap = ReadonlyMap<CoordKey, Transition>;

export interface RevealTiming {
  readonly revealMs: number;
  readonly revealPerTileMs: number;
  readonly dimMs: number;
  readonly dimPerTileMs: number;
}

function progress(transition: Transition, now: number): number {
  if (transition.duration <= 0) return 1;
  return Math.min(1, Math.max(0, (now - transition.start) / transition.duration));
}

/** L'éclairage d'une case à l'instant `now`, entre 0 et 1. Une case inconnue est éteinte. */
export function lightAt(map: LightMap, key: CoordKey, now: number): number {
  const transition = map.get(key);
  if (transition === undefined) return 0;
  return transition.from + (transition.to - transition.from) * easeInOutSine(progress(transition, now));
}

/**
 * Le front de la vague : 1 au milieu d'une case qui s'éclaire, 0 avant et après. Le rendu
 * s'en sert pour faire luire les arêtes au passage de la lumière.
 */
export function crestAt(map: LightMap, key: CoordKey, now: number): number {
  const transition = map.get(key);
  if (transition === undefined || transition.to <= transition.from) return 0;
  const t = progress(transition, now);
  return t <= 0 || t >= 1 ? 0 : Math.sin(Math.PI * t);
}

/** Une transition encore en cours, ou à venir, à l'instant `now`. */
export function settling(map: LightMap, now: number): boolean {
  for (const transition of map.values()) if (progress(transition, now) < 1) return true;
  return false;
}

function distanceToSources(key: CoordKey, sources: readonly Coord[]): number {
  const [x, y] = key.split(",").map(Number);
  const at = { x: x ?? 0, y: y ?? 0 };
  let nearest = Infinity;
  for (const source of sources) nearest = Math.min(nearest, chebyshevDistance(at, source));
  return Number.isFinite(nearest) ? nearest : 0;
}

/**
 * Le nouvel éclairage après un changement de vue. `previous` absent : toutes les cases
 * partent du noir, et la vue entière se déploie depuis les pièces après `delay` (l'entrée
 * du plateau). Une case dont la cible ne change pas garde sa transition en cours.
 */
export function relight(
  previous: LightMap | undefined,
  keys: Iterable<CoordKey>,
  visible: ReadonlySet<CoordKey>,
  sources: readonly Coord[],
  now: number,
  timing: RevealTiming,
  delay = 0,
): LightMap {
  const next = new Map<CoordKey, Transition>();
  for (const key of keys) {
    const target = visible.has(key) ? 1 : 0;
    const prior = previous?.get(key);
    if (prior !== undefined && prior.to === target) {
      next.set(key, prior);
      continue;
    }
    const from = previous === undefined ? 0 : lightAt(previous, key, now);
    const distance = distanceToSources(key, sources);
    next.set(
      key,
      target === 1
        ? { from, to: 1, start: now + delay + distance * timing.revealPerTileMs, duration: timing.revealMs }
        : { from, to: 0, start: now + delay + distance * timing.dimPerTileMs, duration: timing.dimMs },
    );
  }
  return next;
}
