import { Application } from "pixi.js";
import type { QueueIntent } from "@occulis/protocol";
import {
  type Action,
  type ActionError,
  type Coord,
  type Result,
  provisionalRuleset,
} from "@occulis/core";
import { type MoveAnimation, advance as step, startMove } from "./view/animation.js";
import type { Movement } from "./game/movement-diff.js";
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
import { mountAccount } from "./account/mount.js";
import { arrivalNotice, cleanedSearch, routeOf } from "./account/model.js";
import { START, type Seeking, type Stage, advance } from "./ui/flow.js";
import { type Selection, resolveClick } from "./game/selection.js";
import { Scene } from "./scene/scene.js";
import { BACKGROUND } from "./theme.js";
import { type GameConsole, attachConsole } from "./ui/console.js";
import { applyPalette } from "./ui/palette.js";
import { resendVerification, signOut, stopImpersonating, whoAmI, type Identity } from "./net/auth.js";
import { chooseLocale, initLocale, translateDom } from "./i18n/browser.js";
import { currentLocale, messages, onLocaleChange } from "./i18n/current.js";
import { isLocale } from "@occulis/i18n";

/** Racine de composition : elle câble les modules, elle n'en implémente aucun. */
async function main(): Promise<void> {
  initLocale();
  translateDom(document);

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
  /**
   * Un coup envoyé dont le serveur n'a pas encore répondu. Le client n'applique plus
   * rien lui-même : entre l'envoi et la vue, le plateau est celui d'avant, et il ne
   * doit accepter aucun second coup pour le même tour.
   */
  let pending = false;

  const localeSwitch = element<HTMLElement>("locale-switch");
  const go = (event: Parameters<typeof advance>[1]): void => {
    stage = advance(stage, event);
    shell.render(stage);
    localeSwitch.hidden = stage.kind === "game";
  };

  /**
   * Envoie le coup, et **ne déplace rien** : c'est la vue suivante qui fera bouger la
   * pièce et lancera l'animation. Anticiper localement laissait le plateau désynchronisé
   * dès qu'un coup était refusé — le serveur ne rediffuse pas de vue dans ce cas.
   */
  const play = (action: Action): Result<Action, ActionError> => {
    if (match === undefined) return { ok: false, error: { code: "game-over" } };

    const sent = match.play(action);
    if (!sent.ok) return sent;

    pending = true;
    selection = undefined;
    return sent;
  };

  /**
   * Une vue reçue du serveur fait autorité. Elle referme le coup en attente et efface
   * la sélection, qui décrivait une position que le serveur vient de remplacer.
   *
   * `movement` est ce que la vue a fait bouger — son propre coup comme celui de
   * l'adversaire, qui s'anime donc désormais lui aussi.
   */
  const adopt = (movement?: Movement): void => {
    pending = false;
    selection = undefined;
    animation =
      movement === undefined || match === undefined
        ? undefined
        : startMove(movement.pieceId, movement.from, movement.to, match.board);
    gameConsole.refresh();
  };

  /** Referme tout ce qui relie le client au serveur, et vide la table. */
  const leave = (): void => {
    queue?.close();
    queue = undefined;
    channel?.close();
    channel = undefined;
    match = undefined;
    pending = false;
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
        adopt(match?.receive(incoming));
        if (incoming.outcome !== null) gameConsole.announce(incoming.outcome);
      },
      onRejected: (rejection) => {
        // Rien à annuler : le coup n'avait pas été appliqué. Il reste au joueur d'en
        // jouer un autre, et c'est toujours son tour.
        pending = false;
        gameConsole.report(describeRejection(rejection), false);
      },
      onOutdated: (expected) => {
        gameConsole.report(messages().game.outdated(expected), false);
      },
      onStatus: (state) => {
        if (state === "reconnecting") {
          gameConsole.report(messages().game.reconnecting, false);
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
      admin: element<HTMLElement>("menu-admin"),
      corner: element<HTMLElement>("account-corner"),
      cornerName: element<HTMLElement>("account-corner-name"),
      resend: element<HTMLButtonElement>("account-resend"),
      signOut: element<HTMLButtonElement>("account-signout"),
      impersonation: element<HTMLElement>("impersonation"),
      impersonated: element<HTMLElement>("impersonated"),
      stopImpersonating: element<HTMLButtonElement>("stop-impersonating"),
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
          shell.notify(messages().game.outdated(expected));
        },
        onStatus: () => undefined,
      });
    },
    onCancel: leave,
    onStopImpersonating: () => {
      leave();
      void stopImpersonating().then(() => location.assign("/admin/"));
    },
    onSignOut: () => {
      void signOut().then(() => refresh());
    },
    onResend: () => {
      const m = messages().game.menu;
      shell.notify(m.sending);
      void resendVerification(identity.email ?? "").then((outcome) => {
        shell.notify(outcome.ok ? m.resent(identity.email ?? m.yourAddress) : outcome.message);
      });
    },
  });

  // Le parcours et le message de retour sont lus dans l'URL **avant** d'en retirer les
  // paramètres : le jeton de réinitialisation ne doit pas rester dans la barre
  // d'adresse, ni donc dans l'historique.
  const initialRoute = routeOf(location.pathname, location.search);
  let arrival = arrivalNotice(location.pathname, location.search);
  const cleaned = cleanedSearch(location.search);
  if (cleaned !== location.search) history.replaceState(null, "", `${location.pathname}${cleaned}${location.hash}`);

  const renderAccount = mountAccount(element<HTMLElement>("account-root"));
  let identity: Identity = { signedIn: false };

  // L'identité vient du serveur, via un cookie de session : le client ne l'annonce
  // jamais lui-même. Sans compte, la file d'attente répondrait 401.
  const refresh = async (message?: string): Promise<void> => {
    identity = await whoAmI();
    shell.setIdentity(identity);
    // Une déconnexion referme la partie en cours : sans session, ni la file ni le
    // Durable Object n'accepteraient plus rien de ce client.
    if (!identity.signedIn && stage.kind !== "auth") leave();
    go({ kind: "identity", signedIn: identity.signedIn });

    if (identity.signedIn) {
      // Connecté sur une URL de parcours de compte (un lien de connexion ouvert alors
      // qu'on l'est déjà) : on revient à celle du menu.
      if (location.pathname !== "/") history.replaceState(null, "", "/");
      const notice = message ?? arrival?.text;
      if (notice !== undefined) shell.notify(notice);
      arrival = undefined;
      return;
    }
    showAccount();
  };
  const showAccount = (): void => {
    renderAccount({
      initialRoute,
      initialNotice: arrival,
      providers: identity.providers ?? [],
      onSignedIn: (text) => void refresh(text),
      locale: currentLocale(),
    });
  };
  void refresh();

  const markLocale = (): void => {
    for (const button of localeSwitch.querySelectorAll<HTMLButtonElement>("button[data-locale]")) {
      button.setAttribute("aria-current", String(button.dataset["locale"] === currentLocale()));
    }
  };
  localeSwitch.addEventListener("click", (event) => {
    const chosen = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-locale]")?.dataset["locale"];
    if (isLocale(chosen)) chooseLocale(chosen);
  });
  // Tout ce qui est déjà écrit est réécrit : le HTML statique, l'écran courant, l'identité,
  // l'îlot de compte. Les messages déjà affichés (`notify`) gardent leur langue d'origine.
  onLocaleChange(() => {
    translateDom(document);
    markLocale();
    shell.render(stage);
    shell.setIdentity(identity);
    gameConsole.refresh();
    if (!identity.signedIn) showAccount();
  });
  markLocale();

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
    pending: () => pending,
  });

  shell.render(stage);
  localeSwitch.hidden = stage.kind === "game";

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

      const outcome = resolveClick(match.legalActions, match.state, selection, coord);
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
  if (found === null) throw new Error(`element #${id} not found`);
  return found as T;
}

void main();
