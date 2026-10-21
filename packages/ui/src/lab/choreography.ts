import { PROPOSED } from "../tokens.js";
import { easing, type Motion } from "./motion.js";

/**
 * La chorégraphie d'un coup sur le plateau, en fonctions pures du temps : ce que le
 * prototype du labo joue en SVG, et ce que le moteur PixiJS (`apps/web/src/view/`) pourrait
 * reprendre tel quel. Aucune durée ici : tout vient des tokens, tempo et amplitude compris.
 */

export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

const travel = easing(PROPOSED.easing.inOut);

/**
 * La position d'une pièce qui saute de `from` à `to`, à l'avancement `t` (0…1) : un arc dont
 * le sommet monte de `peak` pixels, multiplié par l'amplitude du niveau d'intensité — un
 * glissement à plat en `calm` réduit, aucun arc en `still`.
 */
export function hopAt(
  t: number,
  from: ScreenPoint,
  to: ScreenPoint,
  motion: Motion,
  peak: number = PROPOSED.distance.hop,
): ScreenPoint {
  const s = travel(t);
  const lift = Math.sin(Math.PI * s) * peak * motion.amplitude;
  return { x: from.x + (to.x - from.x) * s, y: from.y + (to.y - from.y) * s - lift };
}

/**
 * Les images rémanentes d'un saut : leur avancement à l'instant `t`, chacune en retard d'un
 * pas sur la précédente. Aucune hors du niveau `full` — c'est un ornement du geste.
 */
export function trailAt(
  t: number,
  motion: Motion,
  count: number = PROPOSED.trail.count,
  lag: number = PROPOSED.trail.lag,
): number[] {
  if (motion.level !== "full") return [];
  return Array.from({ length: count }, (_, index) => Math.max(0, t - lag * (index + 1))).filter(
    (value) => value > 0 && value < 1,
  );
}

/**
 * Le retard d'une case dans une vague (ligne de vue qui se déploie, destinations qui
 * s'ouvrent) : proportionnel à sa distance, nul sous `still` — tout paraît ensemble, en fondu.
 */
export function waveDelayMs(distance: number, kind: "wave" | "cascade", motion: Motion): number {
  return motion.level === "still" ? 0 : distance * PROPOSED.duration[kind] * motion.tempo;
}
