import { coordKey, type Board, type Coord, type CoordKey, type Piece } from "@occulis/core";
import { compareDepth, depthOf, project, tileQuad, type IsoProjection } from "@occulis/board/iso";
import { drawPiece, fitPixelCanvas, terrainDrawables, type Drawable } from "@occulis/board/paint";
import { METRICS, MOTION_FX, look } from "@occulis/board/theme";
import { buildFrames, FRAMES, VIEWER, type Frame } from "./script";

/**
 * Le plateau animé du hero : le rendu Canvas 2D du jeu (`@occulis/board/paint`, celui du
 * rejeu et du déploiement), sur un scénario joué par le vrai moteur (`script.ts`).
 *
 * Tout se déduit du temps écoulé depuis le début de la boucle — aucune transition n'est
 * un état mutable : une image se recalcule à l'identique, et une pause (onglet caché,
 * plateau hors de l'écran) ne fait que geler l'horloge. Les durées et la vague de la
 * ligne de vue sont celles du jeu (`MOTION_FX`).
 */

/** Le premier regard, après l'apparition du plateau. */
const FIRST_LOOK_MS = 500;
/** L'écart entre deux coups, glissement compris. */
const STEP_MS = 2300;
const GLIDE_MS = 620;
/** Le temps laissé à la dernière image, avant que la boucle reparte. */
const HOLD_MS = 3400;
const FADE_MS = 700;
/** Le temps qu'une vague de ligne de vue met à traverser le plateau, apparitions comprises. */
const SETTLE_MS = 20 * MOTION_FX.revealPerTileMs + MOTION_FX.materializeMs;
const PADDING = 12;

interface Timeline {
  /** L'instant où la vue de chaque image s'applique : `commits[k]` pour `frames[k]`. */
  readonly commits: readonly number[];
  /** L'instant où démarre le coup qui mène à `frames[k]` (k ≥ 1). */
  readonly starts: readonly number[];
  readonly total: number;
}

function timelineOf(count: number): Timeline {
  const starts = [0];
  const commits = [FIRST_LOOK_MS];
  for (let k = 1; k < count; k += 1) {
    const start = FIRST_LOOK_MS + 900 + (k - 1) * STEP_MS;
    starts.push(start);
    commits.push(start + GLIDE_MS);
  }
  return { commits, starts, total: (commits.at(-1) ?? 0) + HOLD_MS };
}

const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const clamp01 = (t: number): number => Math.min(1, Math.max(0, t));

/** Distance de Chebyshev d'une case à la plus proche des pièces qui regardent. */
function distanceToViewers(coord: Coord, viewers: readonly Piece[]): number {
  let best = Infinity;
  for (const piece of viewers) {
    best = Math.min(
      best,
      Math.max(Math.abs(piece.coord.x - coord.x), Math.abs(piece.coord.y - coord.y)),
    );
  }
  return best === Infinity ? 0 : best;
}

export function mountBoard(host: HTMLElement, canvas: HTMLCanvasElement, still?: number): void {
  const context = canvas.getContext("2d");
  if (context === null) return;
  const frames = buildFrames();
  const board: Board = frames[0]!.state.board;
  const timeline = timelineOf(frames.length);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const staticFrame = (): number | undefined =>
    still ?? (reduced.matches ? FRAMES.summit : undefined);

  const base = {
    tileWidth: METRICS.tileWidth,
    tileHeight: METRICS.tileHeight,
    heightUnit: METRICS.heightUnit,
    rotation: 0,
    pivot: { x: 0, y: 0 },
  };
  // Les bornes du plateau à l'échelle 1 : de quoi l'ajuster au canevas et le centrer.
  const bounds = (() => {
    const proj: IsoProjection = { ...base, scale: 1 };
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const tile of board.allTiles()) {
      for (const level of [0, tile.height, tile.height + 1.6]) {
        for (const corner of tileQuad(tile.coord, level, proj)) {
          minX = Math.min(minX, corner.x);
          maxX = Math.max(maxX, corner.x);
          minY = Math.min(minY, corner.y);
          maxY = Math.max(maxY, corner.y);
        }
      }
    }
    return { minX, maxX, minY, maxY };
  })();

  let size = { width: 0, height: 0 };
  let clock = 0;
  let last: number | undefined;
  let request: number | undefined;
  let sleeping: ReturnType<typeof setTimeout> | undefined;
  let onScreen = true;

  /** La vue en vigueur à l'instant `now` : l'image courante, et la case est-elle éclairée ? */
  function sightAt(now: number): { k: number; lit: (key: CoordKey, coord: Coord) => boolean } {
    let k = -1;
    for (let i = 0; i < frames.length; i += 1) if ((timeline.commits[i] ?? Infinity) <= now) k = i;
    if (k < 0) return { k: 0, lit: () => false };
    const frame = frames[k]!;
    const visible = frame.knowledge.visible;
    const before = k === 0 ? new Set<CoordKey>() : frames[k - 1]!.knowledge.visible;
    const viewers = [...frame.state.pieces.values()].filter((piece) => piece.owner === VIEWER);
    const since = now - timeline.commits[k]!;
    return {
      k,
      lit: (key, coord) => {
        const now_ = visible.has(key);
        const was = before.has(key);
        if (now_ === was) return now_;
        const distance = distanceToViewers(coord, viewers);
        // La vue se déploie case par case depuis les pièces ; elle se retire d'un bloc.
        return now_
          ? since >= distance * MOTION_FX.revealPerTileMs
          : since < distance * MOTION_FX.dimPerTileMs;
      },
    };
  }

  function draw(now: number, frozen: number | undefined): void {
    if (context === null || size.width === 0) return;
    const ratio = canvas.width / size.width;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, size.width, size.height);

    const scale = Math.min(
      (size.width - PADDING * 2) / (bounds.maxX - bounds.minX),
      (size.height - PADDING * 2) / (bounds.maxY - bounds.minY),
    );
    const proj: IsoProjection = { ...base, scale };
    context.translate(
      size.width / 2 - ((bounds.minX + bounds.maxX) / 2) * scale,
      size.height / 2 - ((bounds.minY + bounds.maxY) / 2) * scale,
    );

    let frame: Frame;
    let lit: (key: CoordKey, coord: Coord) => boolean;
    let glide: { pieceId: string; at: Coord; height: number } | undefined;
    if (frozen !== undefined) {
      frame = frames[frozen]!;
      lit = (key) => frame.knowledge.visible.has(key);
    } else {
      const sight = sightAt(now);
      frame = frames[sight.k]!;
      lit = sight.lit;
      const nextIndex = sight.k + 1;
      const next = frames[nextIndex];
      const start = timeline.starts[nextIndex];
      if (next?.move !== undefined && start !== undefined && now >= start) {
        const t = easeInOut(clamp01((now - start) / GLIDE_MS));
        const { from, to } = next.move;
        const h0 = board.heightAt(from) ?? 0;
        const h1 = board.heightAt(to) ?? 0;
        glide = {
          pieceId: next.move.pieceId,
          at: { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t },
          height: h0 + (h1 - h0) * t + Math.sin(Math.PI * t) * MOTION_FX.hopHeight,
        };
      }
    }

    const isLit = (coord: Coord): boolean => lit(coordKey(coord), coord);
    const drawables: Drawable[] = terrainDrawables(context, board, proj, (key) => {
      const [x, y] = key.split(",").map(Number);
      return lit(key, { x: x ?? 0, y: y ?? 0 });
    });

    const shown = new Set<string>();
    for (const piece of frame.state.pieces.values()) {
      const moving = glide?.pieceId === piece.id ? glide : undefined;
      // Une pièce adverse n'existe à l'écran que sur une case éclairée : c'est le fog.
      if (piece.owner !== VIEWER && !isLit(piece.coord)) continue;
      shown.add(piece.id);
      const at = moving?.at ?? piece.coord;
      const height = moving?.height ?? board.heightAt(piece.coord) ?? 0;
      drawables.push({
        depth: { ...depthOf(at, height, proj), height: height + 0.5 },
        paint: () =>
          drawPiece(
            context,
            project(at, height, proj),
            piece.owner,
            look().pieces.alphaVisible,
            proj,
          ),
      });
    }
    // Les fantômes : la dernière position connue d'une pièce qu'on ne voit plus.
    for (const ghost of frame.knowledge.remembered.values()) {
      if (shown.has(ghost.id) || isLit(ghost.coord)) continue;
      const height = board.heightAt(ghost.coord) ?? 0;
      drawables.push({
        depth: { ...depthOf(ghost.coord, height, proj), height: height + 0.5 },
        paint: () =>
          drawPiece(
            context,
            project(ghost.coord, height, proj),
            ghost.owner,
            look().pieces.alphaGhost,
            proj,
          ),
      });
    }

    drawables.sort((a, b) => compareDepth(a.depth, b.depth));
    // La boucle repart en fondu, jamais d'un coup.
    const fade =
      frozen === undefined ? clamp01((timeline.total - now) / FADE_MS) * clamp01(now / FADE_MS) : 1;
    context.globalAlpha = fade;
    for (const drawable of drawables) drawable.paint();
    context.globalAlpha = 1;
  }

  /**
   * Le prochain instant où l'image change, ou `now` si elle change déjà. Entre deux coups,
   * le plateau est immobile : on ne le redessine pas, on attend le coup suivant.
   */
  function nextChange(now: number): number {
    if (now < FADE_MS || now > timeline.total - FADE_MS) return now;
    for (let k = 0; k < frames.length; k += 1) {
      const start = k === 0 ? 0 : timeline.starts[k]!;
      if (now < start) return start;
      if (now <= timeline.commits[k]! + SETTLE_MS) return now;
    }
    return timeline.total - FADE_MS;
  }

  const tick = (time: number) => {
    request = undefined;
    clock += last === undefined ? 0 : Math.min(100, time - last);
    last = time;
    if (clock >= timeline.total) clock = 0;
    draw(clock, undefined);
    schedule();
  };

  function schedule(): void {
    if (staticFrame() !== undefined) {
      last = undefined;
      draw(0, staticFrame());
      return;
    }
    if (!onScreen || document.hidden) {
      last = undefined;
      return;
    }
    if (request !== undefined || sleeping !== undefined) return;
    const wake = nextChange(clock);
    if (wake <= clock) {
      request = requestAnimationFrame(tick);
      return;
    }
    // L'horloge saute l'attente d'un bloc : rien n'a bougé pendant ce temps.
    sleeping = setTimeout(() => {
      sleeping = undefined;
      clock = wake;
      last = undefined;
      schedule();
    }, wake - clock);
  }

  const resize = () => {
    const fitted = fitPixelCanvas(canvas);
    if (fitted === undefined) return;
    size = fitted;
    const frozen = staticFrame();
    draw(frozen === undefined ? clock : 0, frozen);
    host.classList.add("is-live");
  };

  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? true;
    schedule();
  }).observe(host);
  document.addEventListener("visibilitychange", schedule);
  reduced.addEventListener("change", schedule);
  schedule();
}
