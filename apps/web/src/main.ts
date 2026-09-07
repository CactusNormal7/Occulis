import { Application } from "pixi.js";
import type { QueueIntent } from "@occulis/protocol";
import {
  type Action,
  type ActionError,
  type Coord,
  type GameState,
  type Result,
  coordEquals,
  provisionalRuleset,
} from "@occulis/core";
import { type MoveAnimation, advance as step, startMove } from "./view/animation.js";
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
import { OnlineMatch } from "./game/online-match.js";
import { boardForScenario } from "./game/scenario.js";
import { type MatchChannel, connectToMatch } from "./net/match-channel.js";
import { type QueueChannel, joinQueue } from "./net/queue-channel.js";
import { describeRejection, describeRoomFault } from "./ui/messages.js";
import { attachShell } from "./ui/shell.js";
import { attachAccount } from "./ui/account.js";
import { START, type Seeking, type Stage, advance } from "./ui/flow.js";
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

  const scene = new Scene();
  app.stage.addChild(scene.root);

  /**
   * Il n'existe **aucune partie locale** : tant que le serveur n'a pas assis le
   * joueur, il n'y a rien à jouer et rien à dessiner (docs/design.md section 2).
   */
  let match: OnlineMatch | undefined;
  let channel: MatchChannel | undefined;
  let queue: QueueChannel | undefined;
  let stage: Stage = START;

  const viewport = (): Coord => ({ x: app.screen.width, y: app.screen.height });
  let camera: Camera = createCamera({ x: 0, y: 0 }, viewport());
  let hovered: Coord | undefined;
  let selection: Selection | undefined;
  let animation: MoveAnimation | undefined;
  let gameConsole: GameConsole;

  const go = (event: Parameters<typeof advance>[1]): void => {
    stage = advance(stage, event);
    shell.render(stage);
  };

  const play = (action: Action): Result<GameState, ActionError> => {
    if (match === undefined) return { ok: false, error: { code: "game-over" } };

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
      gameConsole.refresh();
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
    gameConsole.refresh();
  };

  /** Referme tout ce qui relie le client au serveur, et vide la table. */
  const leave = (): void => {
    queue?.close();
    queue = undefined;
    channel?.close();
    channel = undefined;
    match = undefined;
    selection = undefined;
    animation = undefined;
    hovered = undefined;
    scene.clear();
    go({ kind: "menu" });
  };

  const sit = (matchId: string, seat: string): void => {
    channel = connectToMatch(matchId, seat, {
      onSeated: ({ player, scenario, view }) => {
        match = new OnlineMatch(
          boardForScenario(scenario),
          provisionalRuleset(),
          player,
          (action) => channel?.submit(action),
          view,
        );
        camera = createCamera(pivotOf(match.board), viewport());
        go({ kind: "seated" });
        adopt();
      },
      onView: (incoming) => {
        match?.receive(incoming);
        adopt();
      },
      onRejected: (rejection) => {
        // L'anticipation locale a divergé : la vue qui suit rétablit la position.
        gameConsole.report(describeRejection(rejection), false);
      },
      onOutdated: (expected) => {
        gameConsole.report(`Client trop ancien : le serveur attend le protocole ${expected}.`, false);
      },
      onStatus: (state) => {
        if (state === "reconnecting") {
          gameConsole.report("Connexion perdue, reprise en cours…", false);
        }
      },
    });
  };

  const shell = attachShell({
    elements: {
      auth: element<HTMLElement>("screen-auth"),
      menu: element<HTMLElement>("screen-menu"),
      waiting: element<HTMLElement>("screen-waiting"),
      board: host,
      hud: element<HTMLElement>("console"),
      identity: element<HTMLElement>("menu-identity"),
      notice: element<HTMLElement>("menu-notice"),
      quick: element<HTMLButtonElement>("play-quick"),
      host: element<HTMLButtonElement>("play-host"),
      joinForm: element<HTMLFormElement>("join-form"),
      joinCode: element<HTMLInputElement>("join-code"),
      join: element<HTMLButtonElement>("play-join"),
      waitingNote: element<HTMLElement>("waiting-note"),
      waitingCode: element<HTMLElement>("waiting-code"),
      copy: element<HTMLButtonElement>("waiting-copy"),
      cancel: element<HTMLButtonElement>("waiting-cancel"),
      leave: element<HTMLButtonElement>("leave-match"),
    },
    onSeek: (seeking, code) => {
      shell.notify("");
      go({ kind: "seek", seeking });
      queue = joinQueue(intentOf(seeking, code), {
        onWaiting: () => undefined,
        onHosting: (code) => go({ kind: "hosting", code }),
        onFault: (fault) => {
          queue = undefined;
          go({ kind: "menu" });
          shell.notify(describeRoomFault(fault));
        },
        onSeated: ({ matchId, seat }) => {
          queue = undefined;
          sit(matchId, seat);
        },
        onOutdated: (expected) => {
          leave();
          shell.notify(`Client trop ancien : le serveur attend le protocole ${expected}.`);
        },
        onStatus: () => undefined,
      });
    },
    onCancel: leave,
  });

  // L'identité vient du serveur, via un cookie de session : le client ne l'annonce
  // jamais lui-même. Sans compte, la file d'attente répondrait 401.
  attachAccount({
    elements: {
      form: element<HTMLFormElement>("account-form"),
      email: element<HTMLInputElement>("account-email"),
      password: element<HTMLInputElement>("account-password"),
      handle: element<HTMLInputElement>("account-handle"),
      passwordField: element<HTMLElement>("field-password"),
      handleField: element<HTMLElement>("field-handle"),
      submit: element<HTMLButtonElement>("account-submit"),
      tabs: Array.from(document.querySelectorAll<HTMLButtonElement>("#account-tabs button")),
      status: element<HTMLElement>("account-status"),
      signOut: element<HTMLButtonElement>("account-signout"),
      resend: element<HTMLButtonElement>("account-resend"),
      resetForm: element<HTMLFormElement>("reset-form"),
      resetPassword: element<HTMLInputElement>("reset-password"),
    },
    onIdentity: (identity) => {
      shell.setIdentity(identity);
      // Une déconnexion referme la partie en cours : sans session, ni la file ni le
      // Durable Object n'accepteraient plus rien de ce client.
      if (!identity.signedIn && stage.kind !== "auth") leave();
      go({ kind: "identity", signedIn: identity.signedIn });
    },
  });

  applyPalette(document.documentElement);
  gameConsole = attachConsole({
    elements: {
      form: element<HTMLFormElement>("command-form"),
      input: element<HTMLInputElement>("command-input"),
      log: element<HTMLElement>("command-log"),
      status: element<HTMLElement>("status"),
      readout: element<HTMLElement>("tile-readout"),
    },
    match: () => match,
    play,
  });

  shell.render(stage);

  app.renderer.on("resize", () => {
    camera = withViewport(camera, viewport());
  });

  attachControls({
    canvas: app.canvas,
    getCamera: () => camera,
    setCamera: (next) => {
      camera = next;
    },
    pickTile: (point) =>
      match === undefined
        ? undefined
        : tileAt(toProjectionSpace(camera, point), match.board, toProjection(camera)),
    setHovered: (coord) => {
      hovered = coord;
    },
    onPick: (coord) => {
      if (match === undefined) return;
      gameConsole.showTile(coord);

      const outcome = resolveClick(match.state, selection, coord);
      if (outcome.kind === "select") selection = outcome.selection;
      else if (outcome.kind === "clear") selection = undefined;
      else gameConsole.playAction(outcome.action);
    },
  });

  app.ticker.add((ticker) => {
    if (match === undefined) return;
    camera = settle(camera, ticker.deltaMS);

    if (animation !== undefined) {
      animation = step(animation, ticker.deltaMS);
      if (animation === undefined) gameConsole.refresh();
    }

    scene.render({
      board: match.board,
      view: match.viewFor(match.player),
      projection: toProjection(camera),
      origin: originOf(camera),
      hovered,
      selection,
      animation,
    });
  });
}

/** L'entrée de menu choisie, dans la forme que la file d'attente attend. */
function intentOf(seeking: Seeking, code: string | undefined): QueueIntent {
  if (seeking === "join") return { kind: "join", code: code ?? "" };
  if (seeking === "host") return { kind: "host" };
  return { kind: "quick" };
}

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (found === null) throw new Error(`élément #${id} introuvable`);
  return found as T;
}

void main();
