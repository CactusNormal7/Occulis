import { Application } from "pixi.js";
import { type ControlsOptions, attachControls } from "../input/controls.js";
import { BACKGROUND } from "../theme.js";
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
  const app = new Application();
  await app.init({ background: BACKGROUND, resizeTo: window, antialias: true });
  host.appendChild(app.canvas);

  const scene = new Scene();
  app.stage.addChild(scene.root);

  app.renderer.on("resize", hooks.onResize);
  attachControls({ canvas: app.canvas, ...hooks.controls });
  app.ticker.add((ticker) => {
    const input = hooks.frame(ticker.deltaMS);
    if (input !== undefined) scene.render(input);
  });

  return { clear: () => scene.clear() };
}
