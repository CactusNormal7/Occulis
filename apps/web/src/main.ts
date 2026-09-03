import { Application } from "pixi.js";
import {
  type Action,
  type ActionError,
  type Coord,
  type GameState,
  type PlayerId,
  type Result,
  coordEquals,
  opponentOf,
} from "@occulis/core";
import { type MoveAnimation, advance, startMove } from "./view/animation.js";
import {
  type Camera,
  createCamera,
  originOf,
  pivotOf,
  settle,
  toProjection,
  toProjectionSpace,
  withViewport,
} from "./view/camera.js";
import { tileAt } from "./view/picking.js";
import { attachControls } from "./input/controls.js";
import { Match } from "./game/match.js";
import { demoGame } from "./game/scenario.js";
import { type Selection, resolveClick } from "./game/selection.js";
import { Scene } from "./scene/scene.js";
import { BACKGROUND } from "./theme.js";
import { type GameConsole, attachConsole } from "./ui/console.js";
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
  let selection: Selection | undefined;
  let animation: MoveAnimation | undefined;
  let gameConsole: GameConsole;

  const look = (player: PlayerId): void => {
    viewer = player;
    view = match.viewFor(player);
  };

  /**
   * Passage de main, différé jusqu'à la fin de l'animation : basculer la vue tout
   * de suite ferait disparaître en plein vol la pièce qui se déplace, devenue
   * adverse et peut-être hors de la ligne de vue du joueur suivant.
   */
  const handOver = (): void => {
    look(match.activePlayer);
    gameConsole.refresh();
  };

  const play = (action: Action): Result<GameState, ActionError> => {
    // Lus avant d'appliquer : ensuite la pièce n'est plus à sa place de départ.
    const moving = action.kind === "move" ? match.state.pieces.get(action.pieceId) : undefined;
    const destination = action.kind === "move" ? action.to : undefined;

    const result = match.play(action);
    if (!result.ok) return result;

    selection = undefined;
    if (
      moving !== undefined &&
      destination !== undefined &&
      !coordEquals(moving.coord, destination)
    ) {
      animation = startMove(moving.id, moving.coord, destination, match.board);
    } else {
      // Une frappe sur place et un abandon ne déplacent rien : la main passe aussitôt.
      handOver();
    }
    return result;
  };

  applyPalette(element<HTMLElement>("console"));
  gameConsole = attachConsole({
    elements: {
      form: element<HTMLFormElement>("command-form"),
      input: element<HTMLInputElement>("command-input"),
      log: element<HTMLElement>("command-log"),
      status: element<HTMLElement>("status"),
      readout: element<HTMLElement>("tile-readout"),
    },
    match,
    viewer: () => viewer,
    play,
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

      const outcome = resolveClick(match.state, selection, coord);
      if (outcome.kind === "select") selection = outcome.selection;
      else if (outcome.kind === "clear") selection = undefined;
      else gameConsole.playAction(outcome.action);
    },
    toggleViewer: () => {
      look(opponentOf(viewer));
      gameConsole.refresh();
    },
  });

  app.ticker.add((ticker) => {
    camera = settle(camera, ticker.deltaMS);

    if (animation !== undefined) {
      animation = advance(animation, ticker.deltaMS);
      if (animation === undefined) handOver();
    }

    scene.render({
      board: match.board,
      view,
      projection: toProjection(camera),
      origin: originOf(camera),
      hovered,
      selection,
      animation,
    });
  });
}

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (found === null) throw new Error(`élément #${id} introuvable`);
  return found as T;
}

void main();
