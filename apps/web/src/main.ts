import { Application } from "pixi.js";
import { type Coord, type PlayerId, emptyKnowledge, observe, viewFor } from "@occulis/core";
import {
  type Camera,
  createCamera,
  originOf,
  pivotOf,
  settle,
  toProjection,
  toProjectionSpace,
  withViewport,
} from "./camera.js";
import { attachControls } from "./controls.js";
import { tileAt } from "./picking.js";
import { Scene } from "./scene.js";
import { demoGame } from "./scenario.js";
import { BACKGROUND } from "./theme.js";

/** Racine de composition : elle câble les modules, elle n'en implémente aucun. */
async function main(): Promise<void> {
  const host = document.getElementById("app");
  if (host === null) throw new Error("élément #app introuvable");

  const app = new Application();
  await app.init({ background: BACKGROUND, resizeTo: window, antialias: true });
  host.appendChild(app.canvas);

  const state = demoGame();
  const scene = new Scene();
  app.stage.addChild(scene.root);

  let viewer: PlayerId = "A";
  // Recalculé au changement de point de vue seulement : `viewFor` alloue.
  let view = viewFor(state, observe(emptyKnowledge(viewer), state));
  let camera: Camera = createCamera(pivotOf(state.board), {
    x: app.screen.width,
    y: app.screen.height,
  });
  let hovered: Coord | undefined;

  app.renderer.on("resize", () => {
    camera = withViewport(camera, { x: app.screen.width, y: app.screen.height });
  });

  attachControls({
    canvas: app.canvas,
    getCamera: () => camera,
    setCamera: (next) => {
      camera = next;
    },
    pickTile: (point) =>
      tileAt(toProjectionSpace(camera, point), state.board, toProjection(camera)),
    setHovered: (coord) => {
      hovered = coord;
    },
    toggleViewer: () => {
      // Chaque joueur ne voit que sa propre information (docs/design.md 5.4).
      viewer = viewer === "A" ? "B" : "A";
      view = viewFor(state, observe(emptyKnowledge(viewer), state));
    },
  });

  app.ticker.add((ticker) => {
    camera = settle(camera, ticker.deltaMS);
    scene.render({
      board: state.board,
      view,
      projection: toProjection(camera),
      origin: originOf(camera),
      hovered,
    });
  });
}

void main();
