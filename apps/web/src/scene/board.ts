import { Application } from "pixi.js";
import { type ControlsOptions, attachControls } from "../input/controls.js";
import { BACKGROUND } from "../theme.js";
import { pixelResolution } from "../view/pixel.js";
import { Scene, type SceneInput } from "./scene.js";

/**
 * Le plateau à l'écran : l'application Pixi, sa scène, ses gestes et sa boucle d'images.
 *
 * Chargé à part (`import()` depuis `main.ts`) : Pixi est de loin le plus gros morceau du
 * client, et ni l'écran de compte ni le menu n'en ont besoin. Le menu s'affiche donc
 * sans l'avoir téléchargé ni analysé ; il arrive pendant que le joueur choisit sa partie.
 */
export interface BoardHooks {
  readonly controls: Omit<ControlsOptions, "canvas">;
  /** La fenêtre a changé de taille : la caméra doit reprendre ses dimensions. */
  readonly onResize: () => void;
  /** Une image : ce qu'il faut dessiner, ou `undefined` s'il n'y a rien. */
  readonly frame: (deltaMS: number) => SceneInput | undefined;
}

export interface Board {
  /** Vide la table, à la sortie d'une partie. */
  clear(): void;
}

export async function mountBoard(host: HTMLElement, hooks: BoardHooks): Promise<Board> {
  // Le plateau est rendu en basse résolution, sans lissage, puis agrandi au plus proche
  // voisin : c'est ce qui fait le pixel (docs/design.md 8.1, `view/pixel.ts`).
  const resolution = pixelResolution(window.devicePixelRatio);
  const app = new Application();
  await app.init({
    background: BACKGROUND,
    resizeTo: window,
    antialias: false,
    resolution,
    autoDensity: true,
    roundPixels: true,
  });
  app.canvas.style.imageRendering = "pixelated";
  host.appendChild(app.canvas);

  const still = window.matchMedia("(prefers-reduced-motion: reduce)");
  const scene = new Scene(resolution);
  app.stage.addChild(scene.root);

  app.renderer.on("resize", hooks.onResize);
  attachControls({ canvas: app.canvas, ...hooks.controls });
  app.ticker.add((ticker) => {
    const input = hooks.frame(ticker.deltaMS);
    if (input === undefined) return;
    scene.render(input, {
      deltaMS: ticker.deltaMS,
      width: app.screen.width,
      height: app.screen.height,
      still: still.matches,
    });
  });

  return { clear: () => scene.clear() };
}
