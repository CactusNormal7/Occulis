import type { PaperResorb } from "../tokens.js";

/**
 * L'inversion « papier millimétré » : une zone où le thème s'inverse — l'os devient le fond,
 * le vide un quadrillage de points — et qui se propage depuis un point
 * (docs/design/refonte-graphique.md, chantier 3).
 *
 * Ce module est le calendrier, pur et testé : où en est le front à l'instant `t`, dans quel
 * ordre les cases d'une zone du plateau se couvrent. Le dessin est un shader
 * (`paper-gl.ts`) qui ne reçoit que ces quelques nombres à chaque image.
 */

export interface PaperTiming {
  /** La distance à couvrir : le rayon d'un cercle, la plus grande distance d'une zone. */
  readonly reach: number;
  /** La vitesse du front, en unités de `reach` par seconde. */
  readonly speed: number;
  /** Le temps pendant lequel l'inversion reste entière. */
  readonly holdMs: number;
  /** Le temps de la résorption (`dither`) ; `recede` repart, lui, à la vitesse du front. */
  readonly resorbMs: number;
  readonly resorb: PaperResorb;
}

export type PaperPhase = "spread" | "hold" | "resorb" | "done";

export interface PaperFrame {
  readonly phase: PaperPhase;
  /** Le front, dans l'unité de `reach`. */
  readonly front: number;
  /** La part de la trame déjà éteinte, de 0 à 1 (résorption `dither`). */
  readonly dissolve: number;
  /** L'inversion couvre-t-elle déjà toute sa zone ? C'est l'instant où basculer un écran dessous. */
  readonly covered: boolean;
}

export function spreadMs(timing: PaperTiming): number {
  return timing.speed <= 0 ? 0 : (timing.reach / timing.speed) * 1000;
}

/** La durée totale, du point de départ à la dernière trace ; infinie si rien ne se résorbe. */
export function totalMs(timing: PaperTiming): number {
  if (timing.resorb === "none") return Number.POSITIVE_INFINITY;
  const resorb = timing.resorb === "recede" ? spreadMs(timing) : timing.resorbMs;
  return spreadMs(timing) + timing.holdMs + resorb;
}

/**
 * Le front à l'instant `elapsed`. Il avance d'un pas régulier (la vitesse doit se lire), tient,
 * puis se résorbe : par une trame qui s'éteint case par case (`dither`, le geste du voile
 * tramé), en repartant vers son origine (`recede`), ou pas du tout (`none`).
 */
export function paperAt(elapsed: number, timing: PaperTiming): PaperFrame {
  const spread = spreadMs(timing);
  if (elapsed < spread) {
    return {
      phase: "spread",
      front: (elapsed / spread) * timing.reach,
      dissolve: 0,
      covered: false,
    };
  }
  const afterSpread = elapsed - spread;
  if (timing.resorb === "none" || afterSpread < timing.holdMs) {
    return { phase: "hold", front: timing.reach, dissolve: 0, covered: true };
  }
  const resorbing = afterSpread - timing.holdMs;
  if (timing.resorb === "recede") {
    if (resorbing >= spread) return { phase: "done", front: 0, dissolve: 0, covered: false };
    return {
      phase: "resorb",
      front: timing.reach * (1 - resorbing / spread),
      dissolve: 0,
      covered: false,
    };
  }
  if (resorbing >= timing.resorbMs)
    return { phase: "done", front: timing.reach, dissolve: 1, covered: false };
  return {
    phase: "resorb",
    front: timing.reach,
    dissolve: resorbing / timing.resorbMs,
    covered: false,
  };
}

/** La distance d'un point du rectangle `width` × `height` à son coin le plus éloigné : de quoi tout couvrir. */
export function farthestCorner(
  width: number,
  height: number,
  origin: { x: number; y: number },
): number {
  const dx = Math.max(origin.x, width - origin.x);
  const dy = Math.max(origin.y, height - origin.y);
  return Math.hypot(dx, dy);
}

/* ---- Une zone du plateau ------------------------------------------------------------- */

export interface Tile {
  readonly x: number;
  readonly y: number;
}

const key = (tile: Tile): string => `${tile.x},${tile.y}`;

/**
 * La distance de chaque case d'une zone à la case de départ, **en restant dans la zone** :
 * le front contourne un mur, longe un couloir, s'arrête au bord. Pas orthogonaux — ceux du
 * plateau. Une case de la zone que le départ n'atteint pas est absente du résultat ; un
 * départ hors de la zone donne une carte vide.
 */
export function zoneDistances(zone: readonly Tile[], origin: Tile): Map<string, number> {
  const inside = new Set(zone.map(key));
  const distances = new Map<string, number>();
  if (!inside.has(key(origin))) return distances;
  distances.set(key(origin), 0);
  const queue: Tile[] = [origin];
  for (let head = 0; head < queue.length; head += 1) {
    const tile = queue[head] as Tile;
    const distance = distances.get(key(tile)) ?? 0;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const next = { x: tile.x + dx, y: tile.y + dy };
      if (inside.has(key(next)) && !distances.has(key(next))) {
        distances.set(key(next), distance + 1);
        queue.push(next);
      }
    }
  }
  return distances;
}

/**
 * La zone mise en texture pour le shader : une case par texel, `width` × `height`, quatre
 * octets chacune — rouge à 255 si la case est atteinte, vert sa distance (plafonnée à 254).
 */
export function zoneTexels(
  distances: ReadonlyMap<string, number>,
  width: number,
  height: number,
): Uint8Array {
  const texels = new Uint8Array(width * height * 4);
  for (const [tileKey, distance] of distances) {
    const [x, y] = tileKey.split(",").map(Number) as [number, number];
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const offset = (y * width + x) * 4;
    texels[offset] = 255;
    texels[offset + 1] = Math.min(254, distance);
    texels[offset + 3] = 255;
  }
  return texels;
}

/**
 * La plus grande distance d'une zone, plus une case : le front l'a alors entièrement couverte.
 * Plafonnée comme dans la texture (`zoneTexels`), pour que le front n'attende pas des cases
 * que le shader a déjà toutes ouvertes.
 */
export function zoneReach(distances: ReadonlyMap<string, number>): number {
  let max = 0;
  for (const distance of distances.values()) max = Math.max(max, Math.min(254, distance));
  return distances.size === 0 ? 0 : max + 1;
}

/* ---- Projection isométrique ---------------------------------------------------------- */

export interface IsoProjection {
  /** Le centre de la case (0, 0) à l'écran, en pixels CSS. */
  readonly originX: number;
  readonly originY: number;
  /** La largeur et la hauteur d'un losange de case. */
  readonly tileWidth: number;
  readonly tileHeight: number;
}

/** Le centre d'une case à l'écran : la projection du plateau, sans rotation ni hauteur. */
export function project(tile: Tile, iso: IsoProjection): { x: number; y: number } {
  return {
    x: iso.originX + ((tile.x - tile.y) * iso.tileWidth) / 2,
    y: iso.originY + ((tile.x + tile.y) * iso.tileHeight) / 2,
  };
}

/** La case sous un point de l'écran, l'inverse exact de `project()`. */
export function unproject(x: number, y: number, iso: IsoProjection): Tile {
  const u = (x - iso.originX) / (iso.tileWidth / 2);
  const v = (y - iso.originY) / (iso.tileHeight / 2);
  // `+ 0` : `Math.round(-0.2)` vaut -0, qu'une clé de case écrirait « -0 ».
  return { x: Math.round((u + v) / 2) + 0, y: Math.round((v - u) / 2) + 0 };
}

/** Les quatre sommets du losange d'une case, en `points` SVG. */
export function diamond(tile: Tile, iso: IsoProjection): string {
  const { x, y } = project(tile, iso);
  const w = iso.tileWidth / 2;
  const h = iso.tileHeight / 2;
  return `${x},${y - h} ${x + w},${y} ${x},${y + h} ${x - w},${y}`;
}
