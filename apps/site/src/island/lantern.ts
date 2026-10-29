/**
 * La lumière du hero : une grille de cases sous le titre. Autour du pointeur, les cases
 * s'éclairent dans un carré de vue, comme la ligne de vue d'une pièce — et comme elle,
 * elle s'arrête aux murs semés sur la grille. Une case qui sort de la vue en garde un
 * moment le contour : la mémoire du jeu. Le titre, tramé, se découvre dans le même carré.
 *
 * Sans pointeur précis (écran tactile) ou quand la souris quitte le hero, la lumière se
 * promène seule, case par case. Rien ne bouge sous « mouvement réduit » : la grille est
 * dessinée une fois, le titre reste net.
 *
 * Aucune couleur ici : la palette se lit dans les propriétés `--occ-*` de la page.
 */

const CELL = 24;
const RADIUS = 5;
const MEMORY_MS = 1600;
const WANDER_STEP_MS = 140;
const IDLE_MS = 2500;

interface Palette {
  readonly dot: string;
  readonly wall: string;
  readonly near: string;
  readonly mid: string;
  readonly far: string;
  readonly trail: string;
}

function readPalette(): Palette {
  const style = getComputedStyle(document.documentElement);
  const get = (name: string): string => style.getPropertyValue(name).trim();
  return {
    dot: get("--occ-ink-line"),
    wall: get("--occ-ink-faint"),
    near: get("--occ-ink-faint"),
    mid: get("--occ-ink-line"),
    far: get("--occ-ink-ghost"),
    trail: get("--occ-ink-line"),
  };
}

/** Un tirage reproductible : les murs sont les mêmes à chaque visite. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 1831565813) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Cell {
  readonly x: number;
  readonly y: number;
}

export function mountLantern(
  host: HTMLElement,
  canvas: HTMLCanvasElement,
  title: HTMLElement,
): void {
  const context = canvas.getContext("2d");
  if (context === null) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
  const palette = readPalette();

  let cols = 0;
  let rows = 0;
  let walls = new Set<number>();
  let memory = new Float64Array(0);
  let center: Cell | undefined;
  let lit = new Map<number, number>();
  let onScreen = true;
  let wanderTimer: ReturnType<typeof setTimeout> | undefined;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let trailTimer: ReturnType<typeof setTimeout> | undefined;
  let wanderClock = Math.random() * 100;
  let usingPointer = false;

  const index = (x: number, y: number): number => y * cols + x;

  function layout(): void {
    const rect = host.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    context?.setTransform(ratio, 0, 0, ratio, 0, 0);
    cols = Math.ceil(rect.width / CELL);
    rows = Math.ceil(rect.height / CELL);
    memory = new Float64Array(cols * rows);
    // Des murs courts, droits, épars : de quoi couper la vue sans boucher la grille.
    const random = seeded(cols * 31 + rows);
    walls = new Set();
    const count = Math.round((cols * rows) / 46);
    for (let n = 0; n < count; n += 1) {
      const length = 2 + Math.floor(random() * 3);
      const horizontal = random() < 0.5;
      const x0 = Math.floor(random() * cols);
      const y0 = Math.floor(random() * rows);
      for (let k = 0; k < length; k += 1) {
        const x = horizontal ? x0 + k : x0;
        const y = horizontal ? y0 : y0 + k;
        if (x < cols && y < rows) walls.add(index(x, y));
      }
    }
  }

  /** La ligne de la case de vue jusqu'à la case visée traverse-t-elle un mur ? */
  function blocked(from: Cell, to: Cell): boolean {
    const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
    for (let s = 1; s < steps; s += 1) {
      const x = Math.round(from.x + ((to.x - from.x) * s) / steps);
      const y = Math.round(from.y + ((to.y - from.y) * s) / steps);
      if (walls.has(index(x, y))) return true;
    }
    return false;
  }

  /** Les cases vues depuis `from`, avec leur distance. Le premier mur se voit lui-même. */
  function sight(from: Cell): Map<number, number> {
    const seen = new Map<number, number>();
    for (let dy = -RADIUS; dy <= RADIUS; dy += 1) {
      for (let dx = -RADIUS; dx <= RADIUS; dx += 1) {
        const x = from.x + dx;
        const y = from.y + dy;
        if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
        if (blocked(from, { x, y })) continue;
        seen.set(index(x, y), Math.max(Math.abs(dx), Math.abs(dy)));
      }
    }
    return seen;
  }

  function draw(now: number): void {
    if (context === null) return;
    context.clearRect(0, 0, cols * CELL, rows * CELL);
    let soonest = Infinity;
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const i = index(x, y);
        const px = x * CELL;
        const py = y * CELL;
        const distance = lit.get(i);
        if (walls.has(i)) {
          context.fillStyle = palette.wall;
          context.fillRect(px + 2, py + 2, CELL - 4, CELL - 4);
        } else if (distance !== undefined) {
          context.fillStyle =
            distance <= 1 ? palette.near : distance <= 3 ? palette.mid : palette.far;
          context.fillRect(px + 2, py + 2, CELL - 4, CELL - 4);
        } else if (now - (memory[i] ?? 0) < MEMORY_MS) {
          context.strokeStyle = palette.trail;
          context.lineWidth = 1;
          context.strokeRect(px + 3.5, py + 3.5, CELL - 7, CELL - 7);
          soonest = Math.min(soonest, (memory[i] ?? 0) + MEMORY_MS);
        }
        context.fillStyle = palette.dot;
        context.fillRect(px + CELL / 2 - 1, py + CELL / 2 - 1, 2, 2);
      }
    }
    // Les contours s'éteignent d'eux-mêmes : on redessine à la première échéance.
    if (trailTimer !== undefined) clearTimeout(trailTimer);
    trailTimer =
      soonest === Infinity
        ? undefined
        : setTimeout(() => draw(performance.now()), soonest - now + 16);
  }

  /** Le carré de vue, reporté sur le titre : seule cette zone y devient nette. */
  function revealTitle(): void {
    if (center === undefined) {
      title.style.setProperty("--l", "0px");
      title.style.setProperty("--r", "0px");
      return;
    }
    const hostRect = host.getBoundingClientRect();
    const titleRect = title.getBoundingClientRect();
    const dx = titleRect.left - hostRect.left;
    const dy = titleRect.top - hostRect.top;
    title.style.setProperty("--l", `${(center.x - RADIUS) * CELL - dx}px`);
    title.style.setProperty("--r", `${(center.x + RADIUS + 1) * CELL - dx}px`);
    title.style.setProperty("--t", `${(center.y - RADIUS) * CELL - dy}px`);
    title.style.setProperty("--b", `${(center.y + RADIUS + 1) * CELL - dy}px`);
  }

  function lookFrom(cell: Cell | undefined): void {
    if (cell !== undefined && center !== undefined && cell.x === center.x && cell.y === center.y)
      return;
    const now = performance.now();
    // Ce qui était vu et ne l'est plus garde sa trace, datée de maintenant.
    for (const i of lit.keys()) memory[i] = now;
    center = cell;
    lit = cell === undefined ? new Map() : sight(cell);
    draw(now);
    revealTitle();
  }

  function wander(): void {
    wanderTimer = undefined;
    if (usingPointer || !onScreen || document.hidden) return;
    wanderClock += WANDER_STEP_MS / 1000;
    const x = Math.round((0.5 + 0.42 * Math.sin(wanderClock * 0.37)) * (cols - 1));
    const y = Math.round((0.45 + 0.34 * Math.sin(wanderClock * 0.61 + 1.3)) * (rows - 1));
    lookFrom({ x, y });
    wanderTimer = setTimeout(wander, WANDER_STEP_MS);
  }

  function startWander(): void {
    if (wanderTimer === undefined) wanderTimer = setTimeout(wander, WANDER_STEP_MS);
  }

  if (reduced.matches) {
    layout();
    draw(performance.now());
    return;
  }

  host.classList.add("is-lit");
  layout();
  draw(performance.now());
  revealTitle();
  startWander();

  host.addEventListener("pointermove", (event) => {
    if (!fine.matches || event.pointerType === "touch") return;
    usingPointer = true;
    if (idleTimer !== undefined) clearTimeout(idleTimer);
    const rect = host.getBoundingClientRect();
    lookFrom({
      x: Math.floor((event.clientX - rect.left) / CELL),
      y: Math.floor((event.clientY - rect.top) / CELL),
    });
  });

  host.addEventListener("pointerleave", () => {
    if (!usingPointer) return;
    lookFrom(undefined);
    idleTimer = setTimeout(() => {
      usingPointer = false;
      startWander();
    }, IDLE_MS);
  });

  new ResizeObserver(() => {
    layout();
    lit = center === undefined ? new Map() : sight(center);
    draw(performance.now());
    revealTitle();
  }).observe(host);

  new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? true;
    if (onScreen) startWander();
  }).observe(host);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) startWander();
  });

  // Passer en « mouvement réduit » en cours de route : la lumière s'arrête, le titre redevient net.
  reduced.addEventListener("change", () => {
    if (!reduced.matches) return;
    usingPointer = true;
    if (wanderTimer !== undefined) clearTimeout(wanderTimer);
    host.classList.remove("is-lit");
    lookFrom(undefined);
  });
}
