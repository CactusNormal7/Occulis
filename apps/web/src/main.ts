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
import { type MatchChannel, type MatchHandlers, connectToMatch, watchMatch } from "./net/match-channel.js";
import { type SocialChannel, openSocial } from "./net/social-channel.js";
import * as friends from "./social/api.js";
import { EMPTY_SOCIAL, type SocialState, challenged, receive, withOverview } from "./social/model.js";
import { attachFriendsPanel } from "./ui/friends-panel.js";
import type { SocialServerMessage } from "@occulis/protocol";
import { type QueueChannel, joinQueue } from "./net/queue-channel.js";
import { describeRejection, describeRoomFault } from "./ui/messages.js";
import { attachShell } from "./ui/shell.js";
import { mountAccount } from "./account/mount.js";
import { arrivalNotice, cleanedSearch, routeOf } from "./account/model.js";
import { START, type QueueSeeking, type Stage, advance } from "./ui/flow.js";
import { type Selection, resolveClick } from "./game/selection.js";
import { Scene } from "./scene/scene.js";
import { BACKGROUND } from "./theme.js";
import { type GameConsole, attachConsole } from "./ui/console.js";
import { applyPalette } from "./ui/palette.js";
import { resendVerification, signOut, stopImpersonating, whoAmI, type Identity } from "./net/auth.js";

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
  let social: SocialChannel | undefined;
  let socialState: SocialState = EMPTY_SOCIAL;
  /** L'ami défié, tant que sa réponse est attendue. */
  let challengedFriend: string | undefined;
  /** Le pseudo de l'ami regardé : présent, on est spectateur. */
  let watching: string | undefined;
  let spectators = 0;
  let watchDeadline: ReturnType<typeof setTimeout> | undefined;

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

  const go = (event: Parameters<typeof advance>[1]): void => {
    stage = advance(stage, event);
    shell.render(stage);
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
    if (challengedFriend !== undefined) void friends.withdrawChallenge(challengedFriend);
    challengedFriend = undefined;
    watching = undefined;
    spectators = 0;
    clearTimeout(watchDeadline);
    match = undefined;
    pending = false;
    selection = undefined;
    animation = undefined;
    hovered = undefined;
    scene.clear();
    go({ kind: "menu" });
  };

  const handlers: MatchHandlers = {
      onSeated: ({ player, scenario, view, spectating }) => {
        clearTimeout(watchDeadline);
        match = new OnlineMatch(
          boardForScenario(scenario),
          provisionalRuleset(),
          player,
          // Un spectateur n'envoie rien : le serveur refuserait de toute façon.
          (action) => (spectating ? undefined : channel?.submit(action)),
          view,
        );
        camera = createCamera(pivotOf(match.board), viewport());
        go({ kind: "seated", spectating });
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
        gameConsole.report(`Client trop ancien : le serveur attend le protocole ${expected}.`, false);
      },
      onStatus: (state) => {
        if (state === "reconnecting" && match !== undefined) {
          gameConsole.report("Connexion perdue, reprise en cours…", false);
        }
      },
      onSpectators: (count) => {
        spectators = count;
        gameConsole.refresh();
      },
  };

  const sit = (matchId: string, seat: string): void => {
    queue?.close();
    queue = undefined;
    challengedFriend = undefined;
    channel = connectToMatch(matchId, seat, handlers);
  };

  /**
   * Regarder la partie d'un ami. Un refus du serveur ne se voit qu'à l'absence de vue —
   * le socket est refusé avant d'exister — d'où l'échéance.
   */
  const watch = (friend: string, matchId: string, side: "A" | "B"): void => {
    shell.notify("");
    watching = friend;
    go({ kind: "seek", seeking: "watch", friend });
    channel = watchMatch(matchId, side, handlers);
    watchDeadline = setTimeout(() => {
      if (match !== undefined) return;
      leave();
      shell.notify(`Impossible de regarder la partie de ${friend} : elle est peut-être terminée.`);
    }, WATCH_TIMEOUT_MS);
  };

  const renderFriends = (): void => {
    friendsPanel.render(socialState, identity.signedIn && identity.emailVerified !== false);
  };

  const reloadFriends = async (): Promise<void> => {
    const outcome = await friends.overview();
    if (!outcome.ok) return;
    socialState = withOverview(socialState, outcome.value);
    renderFriends();
  };

  const onSocial = (message: SocialServerMessage): void => {
    if (message.kind === "matched") {
      // Un défi accepté : on s'assied, d'où que l'on vienne — sauf d'une partie déjà en
      // cours, que rien ne doit interrompre.
      if (stage.kind === "game") return;
      sit(message.matchId, message.seat);
      return;
    }
    if (
      message.kind === "challenge-cancelled" &&
      message.to === challengedFriend &&
      stage.kind === "waiting" &&
      stage.seeking === "challenge"
    ) {
      const name = stage.friend ?? "Votre ami";
      challengedFriend = undefined;
      go({ kind: "menu" });
      shell.notify(`${name} n'a pas accepté le défi.`);
    }
    if (message.kind === "challenge" && stage.kind === "menu") {
      shell.notify(`${message.challenge.from.handle} vous défie.`);
    }
    const update = receive(socialState, message);
    socialState = update.state;
    renderFriends();
    if (update.stale) void reloadFriends();
  };

  /** Le canal social suit l'identité : ouvert à un compte vérifié, refermé sinon. */
  const syncSocial = (): void => {
    const wanted = identity.signedIn && identity.emailVerified !== false;
    if (wanted && social === undefined) {
      social = openSocial("game", onSocial, (status) => {
        if (status === "open") void reloadFriends();
      });
    }
    if (!wanted && social !== undefined) {
      social.close();
      social = undefined;
      socialState = EMPTY_SOCIAL;
      renderFriends();
    }
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
          shell.notify(`Client trop ancien : le serveur attend le protocole ${expected}.`);
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
      shell.notify("Envoi…");
      void resendVerification(identity.email ?? "").then((outcome) => {
        shell.notify(outcome.ok ? `Message renvoyé à ${identity.email ?? "votre adresse"}.` : outcome.message);
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

  const friendsPanel = attachFriendsPanel({
    elements: {
      root: element<HTMLElement>("menu-friends"),
      challenges: element<HTMLElement>("friends-challenges"),
      list: element<HTMLElement>("friends-list"),
      empty: element<HTMLElement>("friends-empty"),
    },
    onChallenge: (friend) => {
      shell.notify("");
      void friends.challenge(friend.id).then((outcome) => {
        if (!outcome.ok) {
          shell.notify(outcome.message);
          return;
        }
        challengedFriend = friend.id;
        socialState = challenged(socialState, friend.id);
        go({ kind: "seek", seeking: "challenge", friend: friend.handle });
      });
    },
    onWatch: (friend, live) => watch(friend.handle, live.id, live.side),
    onAccept: (challenge) => {
      shell.notify("");
      void friends.acceptChallenge(challenge.from.id).then((outcome) => {
        // En cas de succès, `matched` arrive par le canal social et assied le joueur.
        if (!outcome.ok) shell.notify(outcome.message);
      });
    },
    onDecline: (challenge) => {
      void friends.declineChallenge(challenge.from.id);
    },
  });

  const renderAccount = mountAccount(element<HTMLElement>("account-root"));
  let identity: Identity = { signedIn: false };

  // L'identité vient du serveur, via un cookie de session : le client ne l'annonce
  // jamais lui-même. Sans compte, la file d'attente répondrait 401.
  const refresh = async (message?: string): Promise<void> => {
    identity = await whoAmI();
    shell.setIdentity(identity);
    syncSocial();
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
    renderAccount({
      initialRoute,
      initialNotice: arrival,
      providers: identity.providers ?? [],
      onSignedIn: (text) => void refresh(text),
    });
  };
  void refresh();

  applyPalette(document.documentElement);
  gameConsole = attachConsole({
    elements: {
      form: element<HTMLFormElement>("command-form"),
      input: element<HTMLInputElement>("command-input"),
      log: element<HTMLElement>("command-log"),
      status: element<HTMLElement>("status"),
      readout: element<HTMLElement>("tile-readout"),
      help: element<HTMLElement>("command-help"),
    },
    match: () => match,
    play,
    pending: () => pending,
    watching: () => watching,
    spectators: () => spectators,
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

/** Au-delà, une partie qui n'a envoyé aucune vue au spectateur lui est refusée. */
const WATCH_TIMEOUT_MS = 6000;

/** L'entrée de menu choisie, dans la forme que la file d'attente attend. */
function intentOf(seeking: QueueSeeking, code: string | undefined): QueueIntent {
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
