/**
 * L'ouverture et la fermeture d'une fenêtre flottante : **l'œil qui s'ouvre**. Un trait de
 * lumière d'un pixel se trace au milieu de la fenêtre, du centre vers les bords, deux
 * éclats à ses pointes ; puis il s'écarte en deux paupières qui dévoilent la fenêtre, leur
 * bord frangé d'une trame un-sur-deux qui s'efface à mesure qu'elles s'ouvrent. La
 * fermeture referme les paupières sur le trait, qui se résorbe en son centre.
 *
 * Le geste reprend le motif du jeu — Occulis, l'œil, la ligne de vue qui se déploie — et
 * sa matière : un pixel fin, une trame, l'os pour seule lumière (docs/design.md 8.1). Il est
 * partagé par toutes les fenêtres flottantes du site, pour qu'elles s'ouvrent du même
 * geste ; le menu principal et les pages entières n'en usent pas.
 *
 * Deux moitiés : un calendrier **pur** (`eyeAt`), testé, et `revealWindow()`, qui le joue
 * sur un élément du DOM. La couleur du trait est celle du texte de l'élément (`color`) :
 * l'os pour une fenêtre, la teinte d'un refus pour un message d'erreur. Aucune valeur de
 * couleur ici.
 */

/** Le trait se trace, puis les paupières s'ouvrent, en se chevauchant un peu. */
const LINE_MS = 150;
const LIDS_MS = 300;
const LIDS_AT = 120;
/** À la fermeture, plus vite : les paupières se referment, puis le trait se résorbe. */
const CLOSE_LIDS_MS = 200;
const CLOSE_LINE_MS = 110;

export const OPEN_MS = LIDS_AT + LIDS_MS;
export const CLOSE_MS = CLOSE_LIDS_MS + CLOSE_LINE_MS;

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

function easeOutCubic(t: number): number {
  return 1 - (1 - clamp01(t)) ** 3;
}

function easeInOutSine(t: number): number {
  return 0.5 - 0.5 * Math.cos(Math.PI * clamp01(t));
}

export interface EyeState {
  /** L'étendue du trait, de 0 (un point au centre) à 1 (toute la largeur). */
  readonly line: number;
  /** L'ouverture des paupières, de 0 (fermées sur le trait) à 1 (fenêtre entière). */
  readonly open: number;
  /** L'éclat du trait et des bords de paupière, de 0 à 1. */
  readonly glow: number;
}

/** L'œil `elapsed` millisecondes après le début de l'ouverture ou de la fermeture. */
export function eyeAt(elapsed: number, mode: "open" | "close"): EyeState {
  if (mode === "open") {
    const line = easeOutCubic(elapsed / LINE_MS);
    const open = easeInOutSine((elapsed - LIDS_AT) / LIDS_MS);
    return { line, open, glow: elapsed >= OPEN_MS ? 0 : 1 - open ** 2 };
  }
  const open = 1 - easeInOutSine(elapsed / CLOSE_LIDS_MS);
  const line = 1 - easeOutCubic((elapsed - CLOSE_LIDS_MS) / CLOSE_LINE_MS);
  return { line, open, glow: elapsed >= CLOSE_MS ? 0 : 1 - open ** 2 };
}

const running = new WeakMap<HTMLElement, () => void>();

function prefersStill(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Joue l'ouverture (`"open"`) ou la fermeture (`"close"`) sur `target`, déjà affiché.
 * Rend une promesse tenue à la fin ; la fermeture laisse à l'appelant le soin de masquer
 * l'élément. Sous `prefers-reduced-motion`, ou pour un élément sans taille, elle est tenue
 * tout de suite. Une animation en cours sur le même élément est interrompue.
 *
 * L'ouverture est un `clip-path: inset(…)` qui suit les paupières ; le trait, ses éclats et
 * la frange sont peints dans un canevas posé **dans** l'élément (et non sur la page, pour
 * rester dans la couche du haut d'une `<dialog>` modale). La fenêtre peut grandir en
 * cours d'ouverture (un code qui arrive) : tout suit sa taille à chaque image.
 */
export function revealWindow(target: HTMLElement, mode: "open" | "close" = "open"): Promise<void> {
  running.get(target)?.();
  const first = target.getBoundingClientRect();
  if (prefersStill() || first.width === 0 || first.height === 0) return Promise.resolve();

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
  const context = canvas.getContext("2d");
  const ink = style.color;

  let size = { width: 0, height: 0 };
  const fit = (): void => {
    const current = target.getBoundingClientRect();
    if (current.width === size.width && current.height === size.height) return;
    size = { width: current.width, height: current.height };
    canvas.width = Math.round(size.width * ratio);
    canvas.height = Math.round(size.height * ratio);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
  };

  const restore = { position: target.style.position, clipPath: target.style.clipPath };
  if (style.position === "static") target.style.position = "relative";
  // Rien ne doit paraître avant la première image de l'ouverture.
  if (mode === "open") target.style.clipPath = "inset(50%)";
  target.append(canvas);

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
      fit();
      const { width, height } = size;
      const eye = eyeAt(elapsed, mode);
      const middle = Math.round(height / 2);
      const aperture = Math.round((eye.open * height) / 2);
      const top = middle - aperture;
      const bottom = middle + aperture;
      const half = Math.round((eye.line * width) / 2);
      const left = Math.round(width / 2) - half;
      const right = Math.round(width / 2) + half;

      // Le masque : la bande du trait tant que les paupières sont closes, puis l'ouverture.
      target.style.clipPath =
        aperture <= 1
          ? `inset(${middle - 2}px ${width - right}px ${height - middle - 2}px ${left}px)`
          : `inset(${Math.max(0, top - 1)}px 0 ${Math.max(0, height - bottom - 1)}px 0)`;

      if (context === null) {
        frame = requestAnimationFrame(draw);
        return;
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.fillStyle = ink;

      if (eye.glow > 0) {
        if (aperture <= 1) {
          // Le trait, son halo d'un pixel, et un éclat en losange à chaque pointe.
          context.globalAlpha = eye.glow;
          context.fillRect(left, middle, right - left, 1);
          context.globalAlpha = eye.glow * 0.35;
          context.fillRect(left, middle - 1, right - left, 1);
          context.fillRect(left, middle + 1, right - left, 1);
          context.globalAlpha = eye.glow;
          for (const x of [left, right - 1]) {
            context.fillRect(x - 1, middle - 1, 3, 3);
            context.fillRect(x, middle - 2, 1, 5);
            context.fillRect(x - 2, middle, 5, 1);
          }
        } else {
          // Les bords des paupières, et leur frange tramée qui s'efface à l'ouverture.
          context.globalAlpha = eye.glow;
          context.fillRect(0, top, width, 1);
          context.fillRect(0, bottom - 1, width, 1);
          context.globalAlpha = eye.glow * 0.45;
          for (let row = 1; row <= 4; row += 1) {
            if (row === 3) context.globalAlpha = eye.glow * 0.2;
            for (let x = row % 2; x < width; x += 2) {
              context.fillRect(x, top + row, 1, 1);
              context.fillRect(x, bottom - 1 - row, 1, 1);
            }
          }
        }
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
  });
}
