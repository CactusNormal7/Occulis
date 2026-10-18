/**
 * L'ouverture et la fermeture d'une fenêtre qu'un clic fait paraître : un cadre d'un pixel
 * part d'un point et s'étire jusqu'aux bords de la fenêtre, en la dévoilant ; il s'efface
 * en arrivant. La fermeture le replie vers ce point.
 *
 * Le point est **la souris** pour une fenêtre posée à côté de ce qu'on a cliqué (les
 * réglages sous l'engrenage) : le geste dit d'où elle vient. Il est **le centre** de la
 * fenêtre pour toutes les autres — une modale au milieu de l'écran, un message dans son
 * coin —, et aussi quand la dernière entrée vient du clavier. Les écrans du parcours (menu,
 * compte, attente, bandeau de partie) n'en usent pas : ce ne sont pas des fenêtres qu'on
 * ouvre (docs/design.md 8.1).
 *
 * Deux moitiés : un calendrier **pur** (`spreadAt`, `frameAt`, `originIn`), testé, et
 * `revealWindow()`, qui le joue sur un élément du DOM. La couleur du cadre est celle du
 * texte de l'élément (`color`) : l'os pour une fenêtre, la teinte d'un refus pour un
 * message d'erreur. Aucune valeur de couleur ici.
 */

export const OPEN_MS = 220;
export const CLOSE_MS = 160;

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

/** L'étendue de la fenêtre, de 0 (un point sous la souris) à 1 (la fenêtre entière). */
export function spreadAt(elapsed: number, mode: "open" | "close"): number {
  if (mode === "open") return 1 - (1 - clamp01(elapsed / OPEN_MS)) ** 3;
  return 1 - clamp01(elapsed / CLOSE_MS) ** 2;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Frame {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/**
 * Le point de départ dans la fenêtre (`width` × `height`, coordonnées locales) : le
 * pointeur ramené sur ses bords s'il est dehors, le centre s'il est inconnu.
 */
export function originIn(width: number, height: number, pointer: Point | null): Point {
  if (pointer === null) return { x: width / 2, y: height / 2 };
  return {
    x: Math.min(width, Math.max(0, pointer.x)),
    y: Math.min(height, Math.max(0, pointer.y)),
  };
}

/** Le rectangle dévoilé à l'étendue `spread`, arrondi au pixel. */
export function frameAt(spread: number, origin: Point, width: number, height: number): Frame {
  return {
    left: Math.round(origin.x * (1 - spread)),
    top: Math.round(origin.y * (1 - spread)),
    right: Math.round(origin.x + (width - origin.x) * spread),
    bottom: Math.round(origin.y + (height - origin.y) * spread),
  };
}

/**
 * La dernière position du pointeur, ou `null` si la dernière entrée vient du clavier : une
 * fenêtre ouverte par Entrée ne doit pas jaillir d'une souris immobile à l'autre bout.
 */
let pointer: Point | null = null;
if (typeof window !== "undefined") {
  const track = (event: PointerEvent): void => {
    pointer = { x: event.clientX, y: event.clientY };
  };
  window.addEventListener("pointermove", track, { capture: true, passive: true });
  window.addEventListener("pointerdown", track, { capture: true, passive: true });
  window.addEventListener("keydown", () => (pointer = null), { capture: true, passive: true });
}

const running = new WeakMap<HTMLElement, () => void>();

function prefersStill(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Joue l'ouverture (`"open"`) ou la fermeture (`"close"`) sur `target`, déjà affiché,
 * depuis son centre ou depuis la souris (`from`). `speed` ralentit le geste (`0.25`, quatre
 * fois plus lent) : le design system du back-office s'en sert pour le montrer au ralenti.
 * Rend une promesse tenue à la fin ; la fermeture laisse à l'appelant le soin de masquer
 * l'élément. Sous `prefers-reduced-motion`, ou pour un élément sans taille, elle est tenue
 * tout de suite. Une animation en cours sur le même élément est interrompue.
 *
 * Le dévoilement est un `clip-path: inset(…)` ; le cadre est peint dans un canevas posé
 * **dans** l'élément (et non sur la page, pour rester dans la couche du haut d'une
 * `<dialog>` modale). La fenêtre peut grandir en cours d'ouverture (un code qui arrive) :
 * tout suit sa taille à chaque image, le point de départ restant fixe à l'écran.
 */
export function revealWindow(
  target: HTMLElement,
  mode: "open" | "close" = "open",
  from: "center" | "pointer" = "center",
  { speed = 1 }: { speed?: number } = {},
): Promise<void> {
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
  const anchor = from === "pointer" ? pointer : null;

  let box = first;
  let size = { width: 0, height: 0 };
  const fit = (): void => {
    box = target.getBoundingClientRect();
    if (box.width === size.width && box.height === size.height) return;
    size = { width: box.width, height: box.height };
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
      const elapsed = (now - start) * speed;
      if (elapsed >= total) {
        finish();
        return;
      }
      fit();
      const { width, height } = size;
      const spread = spreadAt(elapsed, mode);
      const origin = originIn(
        width,
        height,
        anchor === null ? null : { x: anchor.x - box.left, y: anchor.y - box.top },
      );
      const shown = frameAt(spread, origin, width, height);
      target.style.clipPath = `inset(${shown.top}px ${width - shown.right}px ${height - shown.bottom}px ${shown.left}px)`;

      if (context !== null) {
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, width, height);
        // Le cadre s'efface à mesure qu'il rejoint les bords de la fenêtre.
        context.globalAlpha = 1 - spread ** 3;
        context.strokeStyle = ink;
        context.lineWidth = 1;
        const w = Math.max(1, shown.right - shown.left);
        const h = Math.max(1, shown.bottom - shown.top);
        context.strokeRect(shown.left + 0.5, shown.top + 0.5, w - 1, h - 1);
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
  });
}
