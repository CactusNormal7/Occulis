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
  provisionalRuleset,
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
import { type MatchSurface, Match } from "./game/match.js";
import { OnlineMatch } from "./game/online-match.js";
import { boardForScenario, demoGame } from "./game/scenario.js";
import { type MatchChannel, connectToMatch } from "./net/match-channel.js";
import { describeRejection } from "./ui/messages.js";
import { attachLobby } from "./ui/lobby.js";
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

  // La démonstration hot-seat reste le mode par défaut ; une partie en ligne prend
  // sa place dès que la file d'attente apparie le joueur.
  let match: MatchSurface = new Match(demoGame());
  let online: OnlineMatch | undefined;
  let channel: MatchChannel | undefined;
  const scene = new Scene();
  app.stage.addChild(scene.root);

  // En hot-seat, la vue suit le joueur au trait et la barre d'espace permet de
  // regarder le plateau avec les yeux de l'autre camp (docs/design.md 5.4). En
  // ligne, elle reste rivée au siège : la vue d'en face n'est pas transmise.
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
    look(online?.player ?? match.activePlayer);
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

  /**
   * Une vue reçue du serveur fait autorité : elle remplace l'anticipation locale, et
   * avec elle toute sélection ou animation en cours, qui décrivaient une position
   * que le serveur vient peut-être de contredire.
   */
  const adopt = (): void => {
    selection = undefined;
    animation = undefined;
    view = match.viewFor(viewer);
    gameConsole.refresh();
  };

  attachLobby({
    elements: {
      button: element<HTMLButtonElement>("play-online"),
      status: element<HTMLElement>("lobby-status"),
    },
    // Aucune authentification n'existe côté serveur : ce nom n'est adossé à rien
    // (docs/technical/server.md, « Non implémenté »).
    playerId: `invite-${Math.floor(Math.random() * 1e9)}`,
    onSeated: (matchId, seat) => {
      channel = connectToMatch(matchId, seat, {
        onSeated: ({ player, scenario, view: first }) => {
          online = new OnlineMatch(
            boardForScenario(scenario),
            provisionalRuleset(),
            player,
            (action) => channel?.submit(action),
            first,
          );
          match = online;
          camera = createCamera(pivotOf(match.board), {
            x: app.screen.width,
            y: app.screen.height,
          });
          viewer = player;
          adopt();
        },
        onView: (incoming) => {
          online?.receive(incoming);
          adopt();
        },
        onRejected: (rejection) => {
          // L'anticipation locale a divergé : la vue qui suit rétablit la position.
          gameConsole.report(describeRejection(rejection), false);
        },
        onOutdated: (expected) => {
          gameConsole.report(`Client trop ancien : le serveur attend le protocole ${expected}.`, false);
        },
      });
    },
  });

  applyPalette(element<HTMLElement>("console"));
  gameConsole = attachConsole({
    elements: {
      form: element<HTMLFormElement>("command-form"),
      input: element<HTMLInputElement>("command-input"),
      log: element<HTMLElement>("command-log"),
      status: element<HTMLElement>("status"),
      readout: element<HTMLElement>("tile-readout"),
    },
    match: () => match,
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
      // Sans objet en ligne : le serveur n'envoie jamais la vue de l'adversaire.
      if (online !== undefined) return;
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
