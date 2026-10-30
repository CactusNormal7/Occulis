import type { TeamPresetList } from "@occulis/protocol";
import { Account } from "./app/account.js";
import { BoardView } from "./app/board-view.js";
import { Debrief, debriefFromPath } from "./app/debrief.js";
import { Friends } from "./app/friends.js";
import {
  type DebriefScreen,
  type EndScreen,
  Islands,
  type LeaveDialog,
  type TeamsScreen,
} from "./app/islands.js";
import { MatchController, type PresetSource } from "./app/match-controller.js";
import { Matchmaking } from "./app/matchmaking.js";
import { Navigation } from "./app/navigation.js";
import {
  boardElement,
  consoleElements,
  friendsPanelElements,
  settingsElements,
  shellElements,
} from "./app/page.js";
import { applyStoredPreferences, attachPreferences } from "./app/preferences.js";
import * as debriefApi from "./debrief/api.js";
import { loadCache } from "./load/cache.js";
import { translateDom } from "./locale/browser.js";
import { messages, onLocaleChange } from "./locale/current.js";
import { stillSeated, whoAmI } from "./net/auth.js";
import { connectToMatch, watchMatch } from "./net/match-channel.js";
import { currentMatch } from "./profile/api.js";
import { friendsOverview, presets as presetsResource } from "./profile/resources.js";
import { attachConsole } from "./ui/console.js";
import { attachShell } from "./ui/shell.js";

/** Les équipes préparées du joueur, lues dans le cache de chargement. */
const TEAM_PRESETS: PresetSource = {
  cached: () => loadCache.value<TeamPresetList>(presetsResource.key)?.presets ?? [],
  reload: async () => {
    const outcome = await loadCache.request(presetsResource, { force: true });
    return outcome.ok ? outcome.value.presets : undefined;
  },
};

/** Racine de composition : elle câble les modules, elle n'en implémente aucun. */
function main(): void {
  // Tout ce que le premier écran montre part ensemble, avant le reste : l'identité, la
  // liste d'amis du menu et une éventuelle partie à reprendre. Le menu ne paraît qu'une
  // fois tout arrivé (« Chargement et premier rendu », docs/technical/engine.md).
  const identityRequest = whoAmI();
  loadCache.preload([friendsOverview]);
  let matchToResume: ReturnType<typeof currentMatch> | undefined = currentMatch();
  applyStoredPreferences();

  // ── État propre à la racine ───────────────────────────────────────────────────────
  let teamsOpen = false;

  // ── Écrans ────────────────────────────────────────────────────────────────────────
  const boardHost = boardElement();
  const settings = attachPreferences(settingsElements());
  const shell = attachShell({
    elements: shellElements(boardHost),
    onSeek: (seeking, code) => matchmaking.seek(seeking, code),
    onCancel: leave,
    onLeaveMatch: leaveMatch,
    onStopImpersonating: () => account.stopImpersonating(),
    onSignOut: () => account.signOut(),
    onResend: () => account.resendVerification(),
    onTeams: openTeams,
  });
  const navigation = new Navigation(shell, settings);
  const islands = new Islands({
    leave: leaveDialog,
    ended: endScreen,
    found: () => matchmaking.proposal,
    deploying: () => matches.deploying,
    teams: teamsScreen,
    debrief: debriefScreen,
  });

  // ── Écran de fin ──────────────────────────────────────────────────────────────────
  const debrief = new Debrief({
    load: (matchId) => loadCache.request(debriefApi.debrief(matchId), { force: true }),
    leave: (matchId) => void debriefApi.leave(matchId),
    go: (event) => navigation.go(event),
    setPath: (path) => history.replaceState(history.state, "", path),
    showIslands: () => islands.render(),
  });

  // ── Partie ────────────────────────────────────────────────────────────────────────
  const matches = new MatchController({
    connect: connectToMatch,
    spectate: watchMatch,
    presets: TEAM_PRESETS,
    stillSeated,
    stage: () => navigation.stage.kind,
    go: (event) => navigation.go(event),
    showIslands: () => islands.render(),
    ensureBoard: () => void board.ensure(),
    clearBoard: () => board.clear(),
    seated: (terrain) => board.center(terrain),
    reports: () => gameConsole,
    notify: (message) => shell.notify(message),
    leave,
    connectionLost: async () => {
      await account.refresh();
      shell.notify(messages().game.connectionLost);
    },
    finished,
  });
  const gameConsole = attachConsole({
    elements: consoleElements(),
    match: () => matches.match,
    play: (action) => matches.play(action),
    pending: () => matches.pending,
    watching: () => matches.watching,
    spectators: () => matches.spectators,
  });
  const board = new BoardView(boardHost, matches, gameConsole);

  // ── File d'attente, amis, compte ──────────────────────────────────────────────────
  const matchmaking = new Matchmaking({
    go: (event) => navigation.go(event),
    notify: (message) => shell.notify(message),
    notifyWaiting: (message) => shell.notifyWaiting(message),
    showIslands: () => islands.render(),
    seated: sit,
    outdated: (expected) => {
      leave();
      shell.notify(messages().game.outdated(expected));
    },
  });
  const friends = new Friends(friendsPanelElements(), {
    stage: () => navigation.stage,
    go: (event) => navigation.go(event),
    notify: (message) => shell.notify(message),
    playable: (): boolean => account.playable,
    matched: sitAfterChallenge,
    watch: (friend, matchId, side) => matches.watch(friend, matchId, side),
  });
  const account = new Account(identityRequest, {
    stage: () => navigation.stage,
    go: (event) => navigation.go(event),
    shell,
    friends,
    leave,
    welcomed: () => {
      // L'écran des équipes s'ouvre alors complet, sans attente.
      board.prewarm(() => loadCache.preload([presetsResource]));
      void arrive();
    },
  });

  // ── Démarrage ─────────────────────────────────────────────────────────────────────
  onLocaleChange(rewriteTexts);
  navigation.render();
  void account.refresh();

  // ── Parcours ──────────────────────────────────────────────────────────────────────

  /**
   * Referme tout ce qui relie le client au serveur, vide la table et revient au menu.
   * L'écran de fin se quitte aussi par là, et le serveur l'apprend.
   */
  function leave(): void {
    debrief.close();
    matchmaking.close();
    friends.withdrawChallenge();
    matches.close();
    islands.render();
    navigation.go({ kind: "menu" });
  }

  /** Assied le joueur à une partie : la file et le défi en cours n'ont plus lieu d'être. */
  function sit(matchId: string, seat: string): void {
    debrief.close();
    matchmaking.close();
    friends.forgetChallenge();
    matches.sit(matchId, seat);
  }

  /**
   * Un défi accepté : on s'assied, d'où que l'on vienne — sauf de sa propre partie, en
   * déploiement ou en cours, que rien ne doit interrompre. La partie d'un ami qu'on
   * regarde, ou une partie finie, cède la place.
   */
  function sitAfterChallenge(matchId: string, seat: string): void {
    if (matches.ownMatchRunning) return;
    sit(matchId, seat);
  }

  /**
   * La partie jouée est close : son écran de fin remplace la table une fois lu. Refusé
   * (illisible, réseau), on revient au menu en le disant.
   */
  function finished(matchId: string): void {
    void debrief.open(matchId).then((opening) => {
      if (opening.kind === "stale") return;
      if (opening.kind === "opened") {
        matches.close();
        return;
      }
      leave();
      shell.notify(opening.message);
    });
  }

  /**
   * L'arrivée au menu, connecté : par le lien d'un écran de fin, on l'ouvre si le serveur
   * le tient encore ouvert ; sinon on rassoit le joueur à sa partie en cours.
   */
  async function arrive(): Promise<void> {
    const linked = debriefFromPath(location.pathname);
    if (linked !== undefined) {
      const opening = await debrief.open(linked);
      if (opening.kind === "opened") return;
      if (opening.kind === "refused") shell.notify(opening.message);
    }
    await resume();
  }

  /**
   * Rassoit le joueur à sa partie en cours. Le jeton de siège ne vit que dans la page :
   * un rechargement le perd, et c'est le serveur qui le rend, à la seule session du
   * joueur. Il a `ABSENCE_MS` pour revenir avant de perdre par forfait.
   */
  async function resume(): Promise<void> {
    if (!idleOnMenu()) return;
    const outcome = await (matchToResume ?? currentMatch());
    matchToResume = undefined;
    if (!outcome.ok || outcome.value === null) return;
    // Le joueur a pu lancer une partie pendant la lecture.
    if (!idleOnMenu()) return;
    sit(outcome.value.matchId, outcome.value.seat);
  }

  /** Au menu, sans partie ni attente en cours. */
  function idleOnMenu(): boolean {
    return navigation.stage.kind === "menu" && !matches.hasChannel && !matchmaking.searching;
  }

  /**
   * Aucun chemin ne ramène à un siège quitté : la fenêtre `leave/` demande l'abandon d'une
   * partie vivante, puis la table attend la vue finale pour montrer l'écran de fin ;
   * partir d'une partie regardée ou finie, non.
   */
  function leaveMatch(): void {
    // L'abandon est parti : seul l'écran de fin attend le joueur, pas le menu.
    if (matches.resigning) return;
    if (matches.requestLeave()) {
      islands.render();
      return;
    }
    leave();
  }

  function leaveDialog(): LeaveDialog | undefined {
    if (!matches.leaving) return undefined;
    return {
      onConfirm: () => {
        matches.confirmLeave();
        islands.render();
      },
      onCancel: () => {
        matches.cancelLeave();
        islands.render();
      },
    };
  }

  function endScreen(): EndScreen | undefined {
    const ended = matches.ended;
    if (ended === undefined) return undefined;
    return {
      ...ended,
      onMenu: leave,
      onBoard: () => {
        matches.dismissEnd();
        islands.render();
      },
    };
  }

  function debriefScreen(): DebriefScreen | undefined {
    const matchId = debrief.matchId;
    if (matchId === undefined) return undefined;
    return {
      matchId,
      onMenu: leave,
      onPlayAgain: () => {
        leave();
        matchmaking.seek("quick");
      },
    };
  }

  function openTeams(): void {
    teamsOpen = true;
    islands.render();
    navigation.go({ kind: "teams" });
  }

  function closeTeams(): void {
    teamsOpen = false;
    islands.render();
    navigation.go({ kind: "menu" });
  }

  function teamsScreen(): TeamsScreen | undefined {
    if (!teamsOpen) return undefined;
    return { onBack: closeTeams };
  }

  /**
   * Tout ce qui est déjà écrit est réécrit : le HTML statique, l'écran courant, l'identité,
   * l'îlot de compte. Les messages déjà affichés (`notify`) gardent leur langue d'origine.
   */
  function rewriteTexts(): void {
    translateDom(document);
    settings.refresh();
    navigation.render();
    account.render();
    gameConsole.refresh();
    islands.render();
  }
}

main();
