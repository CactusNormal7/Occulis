import type { Graphics } from "pixi.js";
import {
  type Mote,
  type Star,
  constellationsOf,
  createMotes,
  createStars,
  fireflyAt,
  moteAt,
  shootingStarAt,
  starAlpha,
} from "../view/ambient.js";
import { snap } from "../view/pixel.js";
import { type Look, look } from "../theme.js";

/**
 * Le ciel du plateau, en coordonnées d'écran : la voûte d'étoiles derrière le plateau
 * (`drawSky`) et les particules en suspension devant (`drawMotes`). Décor pur : ni l'un
 * ni l'autre ne lit l'état de la partie, et tous deux sont des fonctions du temps.
 */

const SEED = 1717;
/** Une étoile filante tous les… au plus. */
const SHOOTING_PERIOD_MS = 7000;
/** Portée d'un segment de constellation, en fraction de l'écran. */
const CONSTELLATION_REACH = 0.11;

interface Vault {
  readonly look: Look;
  readonly stars: readonly Star[];
  readonly links: readonly [number, number][];
  readonly motes: readonly Mote[];
}

let vault: Vault | undefined;

/** La voûte et la nuée du thème courant, tirées une fois par thème. */
function vaultOf(current: Look): Vault {
  if (vault?.look !== current) {
    const stars = createStars(current.atmosphere.stars, SEED);
    vault = {
      look: current,
      stars,
      links: current.atmosphere.constellations ? constellationsOf(stars, CONSTELLATION_REACH) : [],
      motes: createMotes(current.atmosphere.moteCount, SEED + 1),
    };
  }
  return vault;
}

/** Des nuées en anneaux concentriques à peine posés : un dégradé par paliers, à la manière du pixel art. */
function drawNebula(g: Graphics, width: number, height: number, timeMs: number, color: number): void {
  const clouds = [
    { x: 0.22, y: 0.3, r: 0.32 },
    { x: 0.78, y: 0.22, r: 0.26 },
    { x: 0.6, y: 0.82, r: 0.36 },
  ];
  const drift = Math.sin(timeMs / 21_000) * 0.015;
  // Chaque anneau est décalé et aplati différemment : une nuée, pas une cible.
  for (const [c, cloud] of clouds.entries()) {
    for (let ring = 8; ring >= 1; ring -= 1) {
      const r = (cloud.r * ring) / 8;
      const wobble = Math.sin(ring * 1.7 + c * 2.3);
      g.ellipse(
        (cloud.x + drift + wobble * 0.025) * width,
        (cloud.y + Math.cos(ring * 2.1 + c) * 0.02) * height,
        r * width * (1 + wobble * 0.15),
        r * height * (0.55 - wobble * 0.08),
      ).fill({ color, alpha: 0.016 });
    }
  }
}

export function drawSky(g: Graphics, width: number, height: number, timeMs: number, px: number): void {
  const current = look();
  const { stars, links } = vaultOf(current);
  const { star: starColor, aura } = current.palette.sky;
  g.clear();

  if (current.atmosphere.nebula) drawNebula(g, width, height, timeMs, aura);

  for (const [a, b] of links) {
    const from = stars[a];
    const to = stars[b];
    if (from === undefined || to === undefined) continue;
    const pulse = 0.5 + 0.5 * Math.sin(timeMs / 4000 + a);
    g.moveTo(snap(from.x * width, px), snap(from.y * height, px))
      .lineTo(snap(to.x * width, px), snap(to.y * height, px))
      .stroke({ width: px, color: starColor, alpha: 0.12 + pulse * 0.1 });
  }

  for (const star of stars) {
    const size = star.size * px;
    g.rect(snap(star.x * width, px), snap(star.y * height, px), size, size).fill({
      color: starColor,
      alpha: starAlpha(star, timeMs),
    });
  }

  if (current.atmosphere.shootingStars) {
    const shooting = shootingStarAt(timeMs, width, height, SHOOTING_PERIOD_MS, SEED);
    if (shooting !== undefined) {
      g.moveTo(shooting.tailX, shooting.tailY)
        .lineTo(shooting.x, shooting.y)
        .stroke({ width: px, color: starColor, alpha: shooting.alpha * 0.8 });
      g.rect(snap(shooting.x, px), snap(shooting.y, px), px * 2, px * 2).fill({ color: starColor, alpha: shooting.alpha });
    }
  }
}

/** Poussière d'os qui monte, ou lucioles qui errent et luisent, selon le thème. */
export function drawMotes(g: Graphics, width: number, height: number, timeMs: number, px: number): void {
  const current = look();
  const { motes } = vaultOf(current);
  g.clear();
  if (current.atmosphere.motes === "none") return;
  const fireflies = current.atmosphere.motes === "fireflies";
  const color = fireflies ? current.palette.sky.aura : current.palette.ink;
  for (const mote of motes) {
    const at = fireflies ? fireflyAt(mote, timeMs, width, height) : moteAt(mote, timeMs, width, height);
    if (at.alpha <= 0.01) continue;
    const x = snap(at.x, px);
    const y = snap(at.y, px);
    if (fireflies) {
      g.circle(x, y, px * 5).fill({ color, alpha: at.alpha * 0.08 });
      g.circle(x, y, px * 2.5).fill({ color, alpha: at.alpha * 0.15 });
    }
    const size = (fireflies ? 2 : mote.size) * px;
    g.rect(x, y, size, size).fill({ color, alpha: at.alpha });
  }
}
