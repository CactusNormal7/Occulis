/**
 * L'ouverture et la fermeture d'une fenêtre flottante : elle **se construit en petits
 * carrés**. Les carrés couleur d'encre partent du coin de la fenêtre le plus proche de la
 * souris et gagnent, diagonale après diagonale, le coin opposé ; chacun jaillit un peu trop
 * grand, se pose, puis s'efface en dévoilant la fenêtre sous lui. Le balayage est régulier,
 * sans désordre : une vague, pas une nuée. La fermeture rejoue le geste à l'envers, du coin
 * opposé vers celui de la souris : la fenêtre se recouvre de carrés, qui rétrécissent et
 * disparaissent avec elle.
 *
 * Partagée par toutes les fenêtres flottantes du site — fenêtres modales et messages de la
 * charte, panneaux et menus de la page du jeu —, pour qu'elles s'ouvrent toutes du même
 * geste (docs/design.md 8.1). Les pages entières n'en usent pas : elles passent par le fondu
 * entre pages.
 *
 * Deux moitiés : un calendrier **pur** (`cellDelay`, `openCell`, `closeCell`), testé, et
 * `pixelReveal()`, qui le joue sur un élément du DOM. La couleur des carrés est celle du
 * texte de l'élément (`color`) : l'os pour une fenêtre, la teinte d'un refus pour un
 * message d'erreur. Aucune valeur de couleur ici.
 */

/** Le côté d'un carré, en pixels CSS : un multiple de 4, comme toute l'interface. */
export const REVEAL_CELL = 8;

/** Le temps sur lequel les carrés éclosent (ouverture) ou meurent (fermeture). */
export const OPEN_SPREAD_MS = 260;
export const CLOSE_SPREAD_MS = 170;

/** La vie d'un carré : jaillir, rester, s'effacer — à l'ouverture. */
const POP_MS = 90;
const FADE_MS = 230;
/** À la fermeture : s'allumer sur la fenêtre, puis rétrécir et partir avec elle. */
const LIGHT_MS = 70;
const SHRINK_MS = 120;

export const OPEN_MS = OPEN_SPREAD_MS + POP_MS + FADE_MS;
export const CLOSE_MS = CLOSE_SPREAD_MS + LIGHT_MS + SHRINK_MS;

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

function easeOutBack(t: number): number {
  const k = clamp01(t) - 1;
  return 1 + 2.7 * k ** 3 + 1.7 * k ** 2;
}

/** Le coin d'où part le balayage. */
export interface Corner {
  readonly right: boolean;
  readonly bottom: boolean;
}

/**
 * Le rang d'un carré dans le balayage, de 0 (le coin de départ) à 1 (le coin opposé) : sa
 * diagonale, comptée depuis le coin de départ. Tous les carrés d'une même diagonale éclosent
 * ensemble.
 */
export function cellDelay(col: number, row: number, cols: number, rows: number, from: Corner): number {
  const x = from.right ? cols - 1 - col : col;
  const y = from.bottom ? rows - 1 - row : row;
  const span = cols - 1 + (rows - 1);
  return span <= 0 ? 0 : clamp01((x + y) / span);
}

/** Le coin d'un rectangle le plus proche d'un point ; le coin haut gauche sans point connu. */
export function nearestCorner(
  bounds: { readonly left: number; readonly top: number; readonly width: number; readonly height: number },
  point: { readonly x: number; readonly y: number } | undefined,
): Corner {
  if (point === undefined) return { right: false, bottom: false };
  return { right: point.x > bounds.left + bounds.width / 2, bottom: point.y > bounds.top + bounds.height / 2 };
}

let pointer: { x: number; y: number } | undefined;

/** Retient la dernière position de la souris, dès le premier appel. */
function trackPointer(): void {
  if (pointer !== undefined || typeof document === "undefined") return;
  pointer = { x: -1, y: -1 };
  document.addEventListener(
    "pointermove",
    (event) => {
      pointer = { x: event.clientX, y: event.clientY };
    },
    { passive: true, capture: true },
  );
  document.addEventListener(
    "pointerdown",
    (event) => {
      pointer = { x: event.clientX, y: event.clientY };
    },
    { passive: true, capture: true },
  );
}

export interface CellState {
  /** La fenêtre est-elle visible sous ce carré ? */
  readonly visible: boolean;
  /** Le carré d'encre dessiné par-dessus : sa taille relative et son opacité. */
  readonly scale: number;
  readonly alpha: number;
}

/** Un carré à l'ouverture, `age` millisecondes après son éclosion (négatif : pas encore). */
export function openCell(age: number): CellState {
  if (age < 0) return { visible: false, scale: 0, alpha: 0 };
  return {
    visible: true,
    scale: easeOutBack(age / POP_MS),
    alpha: 1 - clamp01((age - POP_MS) / FADE_MS),
  };
}

/** Un carré à la fermeture, `age` millisecondes après le début de sa mort. */
export function closeCell(age: number): CellState {
  if (age < 0) return { visible: true, scale: 1, alpha: 0 };
  if (age < LIGHT_MS) return { visible: true, scale: 1, alpha: age / LIGHT_MS };
  const t = (age - LIGHT_MS) / SHRINK_MS;
  return t >= 1 ? { visible: false, scale: 0, alpha: 0 } : { visible: false, scale: 1 - t, alpha: 1 };
}

const running = new WeakMap<HTMLElement, () => void>();

function prefersStill(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Joue l'ouverture (`"open"`) ou la fermeture (`"close"`) sur `target`, déjà affiché,
 * depuis le coin le plus proche de la dernière position connue de la souris.
 * Rend une promesse tenue à la fin ; la fermeture laisse à l'appelant le soin de masquer
 * l'élément. Sous `prefers-reduced-motion`, ou pour un élément sans taille, elle est tenue
 * tout de suite. Une animation en cours sur le même élément est interrompue.
 *
 * Le masque de la fenêtre est un `clip-path` fait des seuls carrés éclos, fusionnés par
 * lignes ; les carrés d'encre sont peints dans un canevas posé dans la fenêtre — et non par
 * -dessus la page, pour rester dans la couche d'une `<dialog>` modale.
 */
export function pixelReveal(target: HTMLElement, mode: "open" | "close" = "open"): Promise<void> {
  trackPointer();
  running.get(target)?.();
  const bounds = target.getBoundingClientRect();
  if (prefersStill() || bounds.width === 0 || bounds.height === 0) return Promise.resolve();
  const from = nearestCorner(bounds, pointer !== undefined && pointer.x >= 0 ? pointer : undefined);

  const style = getComputedStyle(target);
  const ratio = window.devicePixelRatio || 1;
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "absolute",
    left: `-${style.borderLeftWidth}`,
    top: `-${style.borderTopWidth}`,
    pointerEvents: "none",
    zIndex: "2147483647",
  });
  // La fenêtre peut grandir en cours d'ouverture (un code qui arrive, une liste qui se
  // remplit) : la grille suit sa taille à chaque image, le coin de départ reste le même.
  let size = { width: 0, height: 0 };
  const fit = (): { cols: number; rows: number } => {
    const current = target.getBoundingClientRect();
    if (current.width !== size.width || current.height !== size.height) {
      size = { width: current.width, height: current.height };
      canvas.width = Math.round(size.width * ratio);
      canvas.height = Math.round(size.height * ratio);
      canvas.style.width = `${size.width}px`;
      canvas.style.height = `${size.height}px`;
    }
    return { cols: Math.ceil(size.width / REVEAL_CELL), rows: Math.ceil(size.height / REVEAL_CELL) };
  };
  const context = canvas.getContext("2d");
  const ink = style.color;

  const restore = {
    position: target.style.position,
    clipPath: target.style.clipPath,
  };
  if (style.position === "static") target.style.position = "relative";
  // Rien ne doit paraître avant la première image de l'ouverture.
  if (mode === "open") target.style.clipPath = "inset(50%)";
  target.append(canvas);

  const spread = mode === "open" ? OPEN_SPREAD_MS : CLOSE_SPREAD_MS;
  const total = mode === "open" ? OPEN_MS : CLOSE_MS;
  const start = performance.now();
  let frame = 0;

  return new Promise<void>((resolve) => {
    const finish = (): void => {
      cancelAnimationFrame(frame);
      canvas.remove();
      target.style.position = restore.position;
      target.style.clipPath = restore.clipPath;
      running.delete(target);
      resolve();
    };
    running.set(target, finish);

    const draw = (now: number): void => {
      const elapsed = now - start;
      if (elapsed >= total) {
        finish();
        return;
      }
      const { cols, rows } = fit();
      context?.setTransform(ratio, 0, 0, ratio, 0, 0);
      context?.clearRect(0, 0, size.width, size.height);
      if (context !== null) context.fillStyle = ink;
      const runs: string[] = [];
      let everywhere = true;

      for (let row = 0; row < rows; row += 1) {
        let runStart = -1;
        for (let col = 0; col <= cols; col += 1) {
          const rank = col < cols ? cellDelay(col, row, cols, rows, from) : undefined;
          const delay = rank === undefined ? undefined : mode === "open" ? rank : 1 - rank;
          const cell = delay === undefined ? undefined : (mode === "open" ? openCell : closeCell)(elapsed - delay * spread);
          const visible = cell?.visible === true;
          if (cell !== undefined && !visible) everywhere = false;
          if (visible && runStart < 0) runStart = col;
          if (!visible && runStart >= 0) {
            runs.push(`M${runStart * REVEAL_CELL} ${row * REVEAL_CELL}h${(col - runStart) * REVEAL_CELL}v${REVEAL_CELL}h${-(col - runStart) * REVEAL_CELL}z`);
            runStart = -1;
          }
          if (cell !== undefined && cell.alpha > 0 && cell.scale > 0 && context !== null) {
            // Un pixel de jour entre deux carrés : on les lit un par un.
            const size = Math.max(1, (REVEAL_CELL - 1) * cell.scale);
            const offset = (REVEAL_CELL - size) / 2;
            context.globalAlpha = cell.alpha;
            context.fillRect(col * REVEAL_CELL + offset, row * REVEAL_CELL + offset, size, size);
          }
        }
      }
      // Le masque se lit dans la boîte de bordure, comme le canevas est posé.
      target.style.clipPath = everywhere ? restore.clipPath : runs.length === 0 ? "inset(50%)" : `path("${runs.join("")}")`;
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
  });
}
