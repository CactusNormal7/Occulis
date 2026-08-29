import { Application } from "pixi.js";
import { type Coord, type PlayerId, opponentOf } from "@occulis/core";
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
import { Match } from "./match.js";
import { tileAt } from "./picking.js";
import { Scene } from "./scene.js";
import { demoGame } from "./scenario.js";
import { BACKGROUND } from "./theme.js";
import { attachConsole } from "./ui/console.js";
import { applyPalette } from "./ui/palette.js";

/** Racine de composition : elle câble les modules, elle n'en implémente aucun. */
async function main(): Promise<void> {
  const host = element<HTMLDivElement>("app");
  const app = new Application();
  await app.init({ background: BACKGROUND, resizeTo: window, antialias: true });
  host.appendChild(app.canvas);

  const match = new Match(demoGame());
  const scene = new Scene();
  app.stage.addChild(scene.root);

  // Partie en hot-seat : la vue suit le joueur au trait, la barre d'espace permet
  // de regarder le plateau avec les yeux de l'autre camp (docs/design.md 5.4).
  let viewer: PlayerId = match.activePlayer;
  let view = match.viewFor(viewer);
  let camera: Camera = createCamera(pivotOf(match.board), {
    x: app.screen.width,
    y: app.screen.height,
  });
  let hovered: Coord | undefined;

  const look = (player: PlayerId): void => {
    viewer = player;
    view = match.viewFor(player);
  };

  applyPalette(element<HTMLElement>("console"));
  const gameConsole = attachConsole({
    elements: {
      form: element<HTMLFormElement>("command-form"),
      input: element<HTMLInputElement>("command-input"),
      log: element<HTMLElement>("command-log"),
      status: element<HTMLElement>("status"),
      readout: element<HTMLElement>("tile-readout"),
    },
    match,
    viewer: () => viewer,
    onPlayed: () => {
      look(match.activePlayer);
    },
  });

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
      tileAt(toProjectionSpace(camera, point), match.board, toProjection(camera)),
    setHovered: (coord) => {
      hovered = coord;
    },
    onPick: (coord) => {
      gameConsole.showTile(coord);
    },
    toggleViewer: () => {
      look(opponentOf(viewer));
      gameConsole.refresh();
    },
  });

  app.ticker.add((ticker) => {
    camera = settle(camera, ticker.deltaMS);
    scene.render({
      board: match.board,
      view,
      projection: toProjection(camera),
      origin: originOf(camera),
      hovered,
    });
  });
}

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (found === null) throw new Error(`élément #${id} introuvable`);
  return found as T;
}

void main();
