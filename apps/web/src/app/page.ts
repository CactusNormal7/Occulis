import type { ConsoleElements } from "../ui/console.js";
import type { FriendsPanelElements } from "../ui/friends-panel.js";
import type { SettingsElements } from "../ui/settings.js";
import type { ShellElements } from "../ui/shell.js";

/**
 * Les identifiants de la page du jeu (`index.html`), regroupés par module qui les
 * reçoit. Avec `ui/shell.ts`, c'est le seul endroit qui les connaisse.
 */

/** Résout un `id` de la page, ou lève : un identifiant absent est une erreur de la page. */
export function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (found === null) throw new Error(`element #${id} not found`);
  return found as T;
}

/** L'hôte du canevas PixiJS. */
export function boardElement(): HTMLDivElement {
  return element<HTMLDivElement>("app");
}

export function settingsElements(): SettingsElements {
  return {
    toggle: element<HTMLButtonElement>("settings-toggle"),
    panel: element<HTMLElement>("settings"),
  };
}

export function shellElements(board: HTMLElement): ShellElements {
  return {
    boot: element<HTMLElement>("screen-boot"),
    auth: element<HTMLElement>("screen-auth"),
    menu: element<HTMLElement>("screen-menu"),
    waiting: element<HTMLElement>("screen-waiting"),
    deploy: element<HTMLElement>("screen-deploy"),
    teams: element<HTMLElement>("screen-teams"),
    teamsEntry: element<HTMLButtonElement>("menu-teams"),
    board,
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
  };
}

export function friendsPanelElements(): FriendsPanelElements {
  return {
    root: element<HTMLElement>("menu-friends"),
    challenges: element<HTMLElement>("friends-challenges"),
    list: element<HTMLElement>("friends-list"),
    empty: element<HTMLElement>("friends-empty"),
  };
}

export function consoleElements(): ConsoleElements {
  return {
    form: element<HTMLFormElement>("command-form"),
    input: element<HTMLInputElement>("command-input"),
    log: element<HTMLElement>("command-log"),
    status: element<HTMLElement>("status"),
    readout: element<HTMLElement>("tile-readout"),
    help: element<HTMLElement>("command-help"),
  };
}
