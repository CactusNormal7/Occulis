/**
 * L'alphabet cryptique d'Occulis : des glyphes au trait d'un pixel, qui paraissent de temps
 * à autre et se transforment en texte lisible (docs/design/refonte-graphique.md, chantier 2).
 *
 * Trois directions, toutes tracées dans la même case de 9 × 11 pas, sur la géométrie du
 * plateau :
 * - **lattice** (treillis) — chaque glyphe est un fragment du cube isométrique d'une case :
 *   arêtes du dessus, du dessous et verticales, pentes de 2 pour 1 comme les arêtes du
 *   plateau ;
 * - **stele** (stèles) — un fût vertical et des encoches à trois hauteurs, droites ou
 *   inclinées à la pente isométrique : la hauteur, une écriture de murs ;
 * - **orbit** (orbites) — des étoiles reliées sur une grille de 3 × 3, parfois un œil cranté
 *   au centre : la voûte et le nom du jeu.
 *
 * Tout est pur et déterministe : le même texte, la même graine donnent les mêmes glyphes à
 * chaque passage, et l'alphabet « décodable » est fixe — un joueur peut l'apprendre. Aucun
 * aléa n'est tiré : tout passe par `hash()`.
 */

export type Point = readonly [number, number];
export type Segment = readonly [number, number, number, number];

export interface GlyphShape {
  readonly segments: readonly Segment[];
  /** Des points pleins de deux pas : les étoiles d'une orbite. */
  readonly dots: readonly Point[];
  /** Des anneaux crantés de cinq pas autour d'un point : l'œil. */
  readonly rings: readonly Point[];
}

export const CIPHER_ALPHABETS = ["lattice", "stele", "orbit"] as const;
export type CipherAlphabet = (typeof CIPHER_ALPHABETS)[number];

/** La case d'un glyphe, en pas de `--occ-cipher-unit`. */
export const GLYPH_WIDTH = 9;
export const GLYPH_HEIGHT = 11;

/** Les caractères qu'un alphabet décodable chiffre, dans l'ordre de ses glyphes. */
export const CIPHER_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * Un entier 32 bits mélangé (finaliseur de murmur3) : la seule source de « hasard » du labo.
 * Constantes en décimal : la règle ESLint du code couleur prend tout littéral hexadécimal
 * pour une couleur.
 */
export function hash(...values: readonly number[]): number {
  let h = 2654435769;
  for (const value of values) {
    h = Math.imul(h ^ (value | 0), 2246822507);
    h ^= h >>> 13;
    h = Math.imul(h, 3266489909);
    h ^= h >>> 16;
  }
  return h >>> 0;
}

function shape(
  segments: readonly Segment[],
  dots: readonly Point[] = [],
  rings: readonly Point[] = [],
): GlyphShape {
  return { segments, dots, rings };
}

/* ---- Treillis : les douze arêtes du cube d'une case ---------------------------------- */

const CUBE: Record<string, Point> = {
  t0: [4, 0],
  t1: [8, 2],
  t2: [4, 4],
  t3: [0, 2],
  b0: [4, 6],
  b1: [8, 8],
  b2: [4, 10],
  b3: [0, 8],
};

const CUBE_EDGES: readonly (readonly [string, string])[] = [
  ["t0", "t1"],
  ["t1", "t2"],
  ["t2", "t3"],
  ["t3", "t0"],
  ["b0", "b1"],
  ["b1", "b2"],
  ["b2", "b3"],
  ["b3", "b0"],
  ["t0", "b0"],
  ["t1", "b1"],
  ["t2", "b2"],
  ["t3", "b3"],
];

function edgeSegment([from, to]: readonly [string, string]): Segment {
  const a = CUBE[from] ?? [0, 0];
  const b = CUBE[to] ?? [0, 0];
  return [a[0], a[1], b[0], b[1]];
}

function bits(mask: number, count: number): number[] {
  return Array.from({ length: count }, (_, index) => index).filter((index) => (mask >> index) & 1);
}

/** Les arêtes choisies se touchent toutes, de proche en proche : un glyphe d'un seul tenant. */
function connected(edges: readonly (readonly [string, string])[]): boolean {
  if (edges.length === 0) return false;
  const reached = new Set(edges[0]);
  let grown = true;
  const left = edges.slice(1);
  while (grown) {
    grown = false;
    for (let i = left.length - 1; i >= 0; i -= 1) {
      const edge = left[i];
      if (edge !== undefined && (reached.has(edge[0]) || reached.has(edge[1]))) {
        reached.add(edge[0]);
        reached.add(edge[1]);
        left.splice(i, 1);
        grown = true;
      }
    }
  }
  return left.length === 0;
}

function latticePool(): GlyphShape[] {
  const pool: GlyphShape[] = [];
  for (let mask = 1; mask < 1 << CUBE_EDGES.length; mask += 1) {
    const chosen = bits(mask, CUBE_EDGES.length);
    if (chosen.length < 3 || chosen.length > 5) continue;
    // Une face entière n'est qu'une case vide : elle ne se lit pas comme un signe.
    if ((mask & 0b1111) === 0b1111 || (mask & 0b11110000) === 0b11110000) continue;
    const edges = chosen.map(
      (index): readonly [string, string] => CUBE_EDGES[index] ?? ["t0", "t0"],
    );
    if (!connected(edges)) continue;
    pool.push(shape(edges.map(edgeSegment)));
  }
  return pool;
}

/* ---- Stèles : un fût, des encoches à trois hauteurs ---------------------------------- */

const STELE_SPINE: Segment = [4, 0, 4, 10];
const STELE_LEVELS = [2, 5, 8] as const;

/** Les quatre encoches possibles à une hauteur : à plat ou à la pente isométrique, de chaque côté. */
function steleMarks(y: number): Segment[] {
  return [
    [0, y, 4, y],
    [4, y, 8, y],
    [0, y - 2, 4, y],
    [4, y, 8, y - 2],
  ];
}

function stelePool(): GlyphShape[] {
  const marks = STELE_LEVELS.flatMap((y) => steleMarks(y));
  const pool: GlyphShape[] = [];
  for (let mask = 1; mask < 1 << marks.length; mask += 1) {
    const chosen = bits(mask, marks.length);
    if (chosen.length > 3) continue;
    // Deux encoches au plus par hauteur : au-delà, la hauteur ne se lit plus.
    if (
      STELE_LEVELS.some(
        (_, level) => chosen.filter((index) => Math.floor(index / 4) === level).length > 2,
      )
    )
      continue;
    pool.push(shape([STELE_SPINE, ...chosen.map((index) => marks[index] ?? STELE_SPINE)]));
  }
  return pool;
}

/* ---- Orbites : des étoiles reliées sur une grille de 3 × 3 ---------------------------- */

const ORBIT_NODES: readonly Point[] = [0, 1, 2].flatMap((row) =>
  [0, 1, 2].map((col): Point => [col * 4, 1 + row * 4]),
);
const ORBIT_CENTER = 4;

function neighbours(a: number, b: number): boolean {
  const [ax, ay] = [a % 3, Math.floor(a / 3)];
  const [bx, by] = [b % 3, Math.floor(b / 3)];
  return a !== b && Math.abs(ax - bx) <= 1 && Math.abs(ay - by) <= 1;
}

function orbitPaths(): number[][] {
  const paths: number[][] = [];
  const walk = (path: number[]): void => {
    if (path.length >= 2) paths.push(path);
    if (path.length === 4) return;
    const last = path[path.length - 1] ?? 0;
    for (let next = 0; next < 9; next += 1) {
      if (!path.includes(next) && neighbours(last, next)) walk([...path, next]);
    }
  };
  for (let start = 0; start < 9; start += 1) walk([start]);
  // Un tracé et son inverse font le même glyphe : on ne garde que le premier des deux.
  const seen = new Set<string>();
  return paths.filter((path) => {
    const key = path.join(",");
    const reverse = [...path].reverse().join(",");
    if (seen.has(reverse)) return false;
    seen.add(key);
    return true;
  });
}

function orbitPool(): GlyphShape[] {
  return orbitPaths().map((path, index) => {
    const points = path.map((node): Point => ORBIT_NODES[node] ?? [0, 0]);
    const segments = points.slice(1).map((point, i): Segment => {
      const from = points[i] ?? point;
      return [from[0], from[1], point[0], point[1]];
    });
    // L'œil est rare : un tracé qui passe par le centre sur trois le porte.
    const eye = path.includes(ORBIT_CENTER) && hash(index, 7) % 3 === 0;
    return shape(segments, points, eye ? [ORBIT_NODES[ORBIT_CENTER] ?? [4, 5]] : []);
  });
}

/* ---- Alphabets ----------------------------------------------------------------------- */

const POOLS: Record<CipherAlphabet, () => GlyphShape[]> = {
  lattice: latticePool,
  stele: stelePool,
  orbit: orbitPool,
};

/** Le signe d'un caractère que l'alphabet ne chiffre pas (ponctuation) : le plus simple de tous. */
const STOPS: Record<CipherAlphabet, GlyphShape> = {
  lattice: shape([edgeSegment(["t2", "b2"])]),
  stele: shape([STELE_SPINE]),
  orbit: shape([], [ORBIT_NODES[ORBIT_CENTER] ?? [4, 5]]),
};

/** Les graines qui figent chaque alphabet décodable. Les changer change l'alphabet appris. */
const ALPHABET_SEEDS: Record<CipherAlphabet, number> = { lattice: 3265, stele: 24094, orbit: 2839 };

export interface Alphabet {
  readonly name: CipherAlphabet;
  /** Tous les glyphes de la direction, dans un ordre fixe : l'ornement y puise. */
  readonly pool: readonly GlyphShape[];
  /** Un glyphe par caractère de `CIPHER_CHARSET`, deux à deux distincts : la clé décodable. */
  readonly key: readonly GlyphShape[];
  readonly stop: GlyphShape;
}

const cache = new Map<CipherAlphabet, Alphabet>();

/** Mélange déterministe (Fisher-Yates sur `hash`). */
function shuffled<T>(items: readonly T[], seed: number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = hash(seed, i) % (i + 1);
    [result[i], result[j]] = [result[j] as T, result[i] as T];
  }
  return result;
}

export function alphabet(name: CipherAlphabet): Alphabet {
  const known = cache.get(name);
  if (known !== undefined) return known;
  const pool = POOLS[name]();
  const built: Alphabet = {
    name,
    pool,
    key: shuffled(pool, ALPHABET_SEEDS[name]).slice(0, CIPHER_CHARSET.length),
    stop: STOPS[name],
  };
  cache.set(name, built);
  return built;
}

/** Un caractère ramené à l'alphabet chiffré : majuscule, sans accent (« é » → « E »). */
export function foldChar(char: string): string {
  return char.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
}

export function isGap(char: string): boolean {
  return /\s/.test(char);
}

/**
 * Le glyphe qui chiffre `char`, à la position `index` d'une chaîne.
 * - **décodable** : toujours le même glyphe pour la même lettre, où qu'elle soit — une
 *   substitution simple, qu'un joueur patient peut casser ;
 * - **ornement** : un glyphe tiré de la position et de la graine, sans rapport stable avec la
 *   lettre — deux « E » ne se ressemblent pas, rien n'est déchiffrable.
 */
export function cipherGlyph(
  char: string,
  index: number,
  name: CipherAlphabet,
  decodable: boolean,
  seed = 0,
): GlyphShape {
  const set = alphabet(name);
  const folded = foldChar(char);
  const position = CIPHER_CHARSET.indexOf(folded);
  if (decodable)
    return position === -1 || folded.length !== 1 ? set.stop : (set.key[position] ?? set.stop);
  return set.pool[hash(seed, index, folded.codePointAt(0) ?? 0) % set.pool.length] ?? set.stop;
}

/** Un glyphe de passage, pendant qu'un caractère se brouille : change à chaque `variant`. */
export function scrambleGlyph(
  index: number,
  variant: number,
  name: CipherAlphabet,
  seed = 0,
): GlyphShape {
  const set = alphabet(name);
  return set.pool[hash(seed, index, variant, 92) % set.pool.length] ?? set.stop;
}

/* ---- Calendrier du déchiffrement ----------------------------------------------------- */

export type CellState =
  | { readonly state: "cipher" }
  | { readonly state: "scramble"; readonly variant: number }
  | { readonly state: "plain" };

export interface DecodeTiming {
  /** La durée totale, du premier glyphe qui bouge à la dernière lettre posée. */
  readonly durationMs: number;
  /** Le pas d'un glyphe qui se brouille. */
  readonly tickMs: number;
  /** Les glyphes se brouillent-ils avant de céder ? Non en `calm` et `still`. */
  readonly scramble: boolean;
  readonly seed?: number;
}

/** Le nombre de pas pendant lesquels un caractère se brouille avant de se poser. */
export const SCRAMBLE_TICKS = 4;

/**
 * L'instant où le caractère `index` d'une chaîne de `length` se pose, en millisecondes. De
 * gauche à droite, avec un léger désordre : la lecture suit le sens du texte sans avoir l'air
 * d'une machine à écrire.
 */
export function settleAt(index: number, length: number, timing: DecodeTiming): number {
  if (length <= 1) return timing.durationMs;
  // Un pas de repos avant le premier brouillage : la première image montre le texte chiffré.
  const lead = (timing.scramble ? SCRAMBLE_TICKS + 1 : 1) * timing.tickMs;
  const span = Math.max(0, timing.durationMs - lead);
  const order = index / (length - 1);
  const jitter = ((hash(timing.seed ?? 0, index, 209) % 1000) / 1000 - 0.5) * 0.25;
  return lead + span * Math.min(1, Math.max(0, order + jitter));
}

/**
 * L'état du caractère `index` à l'instant `elapsed` d'un déchiffrement (`decode` : glyphe →
 * lettre) ou d'un chiffrement (`encode` : lettre → glyphe).
 *
 * Juste avant de céder sa lettre, un caractère montre **son vrai glyphe** pendant un pas :
 * avec un alphabet décodable, c'est ce qui permet d'associer un signe à sa lettre.
 */
export function cellAt(
  index: number,
  length: number,
  elapsed: number,
  timing: DecodeTiming,
  direction: "decode" | "encode",
): CellState {
  const settle = settleAt(index, length, timing);
  const scrambleFrom = settle - SCRAMBLE_TICKS * timing.tickMs;
  const truthFrom = settle - timing.tickMs;
  if (direction === "decode") {
    if (elapsed >= settle) return { state: "plain" };
    if (!timing.scramble || elapsed < scrambleFrom || elapsed >= truthFrom)
      return { state: "cipher" };
    return { state: "scramble", variant: Math.floor((elapsed - scrambleFrom) / timing.tickMs) };
  }
  // Le chiffrement est le même geste remonté dans le temps — la lettre tient, se brouille,
  // se fige — et lu en miroir, pour qu'il parte lui aussi de la gauche.
  if (elapsed >= timing.durationMs) return { state: "cipher" };
  return cellAt(length - 1 - index, length, timing.durationMs - elapsed, timing, "decode");
}

/**
 * Le glyphe d'un ornement à l'instant `elapsed` : chaque case frémit à son rythme, si bien
 * que la frise entière change d'un glyphe toutes les `flickerMs` en moyenne — jamais en bloc.
 */
export function flickerVariant(
  index: number,
  count: number,
  elapsed: number,
  flickerMs: number,
  seed = 0,
): number {
  const period = flickerMs * Math.max(1, count) * (0.75 + (hash(seed, index, 241) % 500) / 1000);
  const phase = (hash(seed, index, 242) % 1000) / 1000;
  return Math.floor(elapsed / period + phase);
}
