import type { Coord } from "@occulis/core";
import { clamp01, easeOutBack, easeOutCubic, phase } from "./easing.js";

/**
 * Les effets du plateau qui ne dépendent que du temps : entrée du plateau, cascade des
 * destinations, retombée d'une pièce, matérialisation. Module pur : il dit **où en est**
 * chaque effet, la scène (`render/pixi/`) le dessine.
 */

/**
 * L'entrée d'une case : de combien de niveaux elle est encore sous sa place (`drop`), et
 * son opacité. `rank` va de 0 (la case la plus lointaine) à 1 (la plus proche) : la vague
 * monte du fond vers le joueur.
 */
export function introOf(
  rank: number,
  elapsed: number,
  timing: { readonly introMs: number; readonly introSpreadMs: number; readonly introDepth: number },
): { readonly drop: number; readonly alpha: number } {
  const t = phase(elapsed, rank * timing.introSpreadMs, timing.introMs);
  return { drop: (1 - easeOutBack(t, 1.4)) * timing.introDepth, alpha: easeOutCubic(t * 1.6) };
}

/** La durée totale de l'entrée du plateau. */
export function introLength(timing: {
  readonly introMs: number;
  readonly introSpreadMs: number;
}): number {
  return timing.introMs + timing.introSpreadMs;
}

/** L'ouverture d'une destination, par distance à la pièce sélectionnée : 0 fermée, 1 ouverte. */
export function cascadeOf(
  distance: number,
  elapsed: number,
  perTileMs: number,
  durationMs: number,
): number {
  return easeOutBack(phase(elapsed, Math.max(0, distance - 1) * perTileMs, durationMs), 2.2);
}

export interface Spark {
  /** Direction au sol, en cases, et vitesse de montée en niveaux. */
  readonly dx: number;
  readonly dy: number;
  readonly rise: number;
}

/** Les étincelles d'une retombée, réparties en couronne avec un léger désordre fixe. */
export function sparksOf(count: number, seed: number): Spark[] {
  return Array.from({ length: count }, (_, i) => {
    const jitter = Math.sin(seed * 12.9898 + i * 78.233) * 0.5 + 0.5;
    const angle = (i / count) * Math.PI * 2 + jitter * 0.6;
    const reach = 0.35 + jitter * 0.3;
    return { dx: Math.cos(angle) * reach, dy: Math.sin(angle) * reach, rise: 0.6 + jitter * 0.9 };
  });
}

export interface Landing {
  readonly coord: Coord;
  readonly height: number;
  readonly color: number;
  readonly start: number;
}

/**
 * Où en est une retombée : l'onde au sol s'élargit et s'efface, les étincelles montent puis
 * retombent en s'éteignant. `undefined` une fois finie.
 */
export function landingAt(
  landing: Landing,
  now: number,
  durationMs: number,
):
  | {
      readonly ring: number;
      readonly ringAlpha: number;
      readonly spark: number;
      readonly sparkAlpha: number;
    }
  | undefined {
  const t = phase(now, landing.start, durationMs);
  if (t >= 1 || now < landing.start) return undefined;
  return {
    ring: 0.55 + easeOutCubic(t) * 0.9,
    ringAlpha: (1 - t) ** 2,
    spark: t,
    sparkAlpha: clamp01(1 - t * 1.2),
  };
}

/**
 * La matérialisation d'une pièce adverse qui entre dans la vue : elle descend de quelques
 * pixels en se densifiant, et son œil s'allume un instant plus fort que de coutume.
 */
export function materializeAt(
  start: number,
  now: number,
  durationMs: number,
): { readonly alpha: number; readonly drop: number; readonly flash: number } {
  const t = phase(now, start, durationMs);
  return {
    alpha: easeOutCubic(t),
    drop: (1 - easeOutCubic(t)) * 6,
    flash: t < 1 ? Math.sin(Math.PI * t) : 0,
  };
}

/**
 * La pose d'un piège : le sceau tombe de plus grand que la case et s'y fixe (`scale`, de
 * ~1,6 à 1), la case s'éclaire puis s'éteint (`flash`), les éclats convergent
 * (`gather`, de 0 au loin à 1 sur le sceau). `undefined` une fois finie.
 */
export function trapLayingAt(
  elapsed: number,
  durationMs: number,
):
  | {
      readonly scale: number;
      readonly alpha: number;
      readonly flash: number;
      readonly gather: number;
    }
  | undefined {
  const t = phase(elapsed, 0, durationMs);
  if (t >= 1 || elapsed < 0) return undefined;
  return {
    scale: 1 + (1 - easeOutBack(clamp01(t * 1.6), 2)) * 0.6,
    alpha: easeOutCubic(clamp01(t * 3)),
    flash: (1 - t) ** 2,
    gather: easeOutCubic(clamp01(t * 1.4)),
  };
}

/**
 * Un piège qui se déclenche, sur la case, une fois la pièce arrivée. Trois temps : les
 * mâchoires se referment (`jaws`, de 0 ouvertes à 1 fermées), la pièce tremble et se
 * dissout (`victimAlpha`, `shake`), puis la cicatrice du piège s'efface (`scar`).
 * `undefined` une fois fini.
 */
export function trapSpringAt(
  elapsed: number,
  durationMs: number,
):
  | {
      readonly jaws: number;
      readonly flash: number;
      readonly victimAlpha: number;
      readonly rise: number;
      readonly shake: number;
      readonly burst: number;
      readonly scar: number;
    }
  | undefined {
  const t = phase(elapsed, 0, durationMs);
  if (t >= 1 || elapsed < 0) return undefined;
  const closing = clamp01(t / 0.18);
  const dissolve = clamp01((t - 0.2) / 0.35);
  return {
    jaws: easeOutBack(closing, 2.4),
    flash: closing < 1 ? closing : Math.max(0, 1 - (t - 0.18) / 0.25),
    victimAlpha: 1 - easeOutCubic(dissolve),
    rise: easeOutCubic(dissolve),
    // Un tremblement bref, qui s'amortit pendant que la pièce s'efface.
    shake: dissolve > 0 && dissolve < 1 ? Math.sin(t * 90) * (1 - dissolve) : 0,
    burst: clamp01((t - 0.15) / 0.45),
    scar: t < 0.18 ? 0 : (1 - clamp01((t - 0.18) / 0.82)) ** 1.5,
  };
}
