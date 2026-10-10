import type { Identity } from "../net/auth.js";
import type { Seeking, Stage } from "./flow.js";
import { describeIdentity, describeWaiting } from "./messages.js";
import { messages } from "../i18n/current.js";

/**
 * Les écrans : compte, menu, attente, partie. Un seul est visible à la fois.
 *
 * Ce module montre ce que `flow.ts` a décidé — il ne décide rien lui-même, et
 * n'appelle jamais le réseau : il rend les gestes du joueur à la racine de
 * composition. C'est le pendant DOM de la machine à états, et le seul endroit qui
 * connaisse les identifiants de la page avec `main.ts`.
 *
 * L'écran de compte n'est ici qu'un conteneur montré ou masqué : son contenu est
 * l'îlot React de `src/account/`, sur la charte.
 */
export interface ShellElements {
  readonly auth: HTMLElement;
  readonly menu: HTMLElement;
  readonly waiting: HTMLElement;
  /** Le déploiement et les équipes : deux îlots React, ici seulement montrés ou masqués. */
  readonly deploy: HTMLElement;
  readonly teams: HTMLElement;
  readonly teamsEntry: HTMLButtonElement;
  /** Le canevas de jeu, montré seulement une fois la partie commencée. */
  readonly board: HTMLElement;
  readonly hud: HTMLElement;

  readonly identity: HTMLElement;
  /** Le lien vers `/admin/`, montré aux seuls administrateurs. */
  readonly admin: HTMLElement;
  /** Le lien vers le profil, en haut à droite, et le pseudo qu'il affiche. */
  readonly corner: HTMLElement;
  readonly cornerName: HTMLElement;
  /** Renvoie le message de vérification ; montré tant que l'adresse ne l'est pas. */
  readonly resend: HTMLButtonElement;
  readonly signOut: HTMLButtonElement;
  /** Le bandeau d'usurpation, et son bouton de retour au compte administrateur. */
  readonly impersonation: HTMLElement;
  readonly impersonated: HTMLElement;
  readonly stopImpersonating: HTMLButtonElement;
  readonly notice: HTMLElement;
  readonly quick: HTMLButtonElement;
  readonly host: HTMLButtonElement;
  readonly joinForm: HTMLFormElement;
  readonly joinCode: HTMLInputElement;
  readonly join: HTMLButtonElement;

  readonly waitingNote: HTMLElement;
  readonly waitingCode: HTMLElement;
  readonly copy: HTMLButtonElement;
  readonly cancel: HTMLButtonElement;
  readonly leave: HTMLButtonElement;
}

export interface ShellOptions {
  readonly elements: ShellElements;
  /** Le joueur demande une partie ; `code` n'accompagne que « rejoindre ». */
  readonly onSeek: (seeking: Seeking, code?: string) => void;
  /** Retour au menu : annulation d'une attente, ou sortie d'une partie. */
  readonly onCancel: () => void;
  /** L'administrateur quitte l'identité d'emprunt. */
  readonly onStopImpersonating: () => void;
  readonly onSignOut: () => void;
  readonly onResend: () => void;
  /** Le joueur ouvre ses équipes préparées. */
  readonly onTeams: () => void;
}

export interface Shell {
  render(stage: Stage): void;
  /** L'identité rendue par le serveur : elle ouvre ou ferme les entrées du menu. */
  setIdentity(identity: Identity): void;
  /** Un mot au joueur sur l'écran de menu — un code refusé, une partie terminée. */
  notify(message: string): void;
  /** Un mot sur l'écran d'attente, à la place de la phrase d'attente — une partie non acceptée. */
  notifyWaiting(message: string): void;
}

export function attachShell(options: ShellOptions): Shell {
  const e = options.elements;
  let playable = false;
  let signedIn = false;
  let onMenu = false;
  // Le coin n'a de sens qu'au menu : en attente, il ferait quitter la file ; en partie, il
  // ferait quitter le siège.
  const showCorner = (): void => {
    e.corner.hidden = !(signedIn && onMenu);
  };

  e.quick.addEventListener("click", () => options.onSeek("quick"));
  e.stopImpersonating.addEventListener("click", () => options.onStopImpersonating());
  e.signOut.addEventListener("click", () => options.onSignOut());
  e.resend.addEventListener("click", () => options.onResend());
  e.host.addEventListener("click", () => options.onSeek("host"));
  e.teamsEntry.addEventListener("click", () => options.onTeams());

  e.joinForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const code = e.joinCode.value.trim();
    if (code.length === 0 || !playable) return;
    options.onSeek("join", code);
  });

  // Le code est fait pour être recopié à la main : la saisie est mise en capitales
  // à mesure, pour qu'elle ressemble à ce que l'hôte a sous les yeux.
  e.joinCode.addEventListener("input", () => {
    e.joinCode.value = e.joinCode.value.toUpperCase();
  });

  e.cancel.addEventListener("click", () => options.onCancel());
  e.leave.addEventListener("click", () => options.onCancel());

  e.copy.addEventListener("click", () => {
    void navigator.clipboard?.writeText(e.waitingCode.textContent ?? "").then(() => {
      e.copy.textContent = messages().game.waiting.copied;
    });
  });

  const render = (stage: Stage): void => {
    e.auth.hidden = stage.kind !== "auth";
    e.menu.hidden = stage.kind !== "menu";
    // La fenêtre d'acceptation se pose sur l'écran d'attente, qui reste derrière elle.
    e.waiting.hidden = stage.kind !== "waiting" && stage.kind !== "proposal";
    e.deploy.hidden = stage.kind !== "deploying";
    e.teams.hidden = stage.kind !== "teams";
    e.board.hidden = stage.kind !== "game";
    e.hud.hidden = stage.kind !== "game";
    onMenu = stage.kind === "menu";
    showCorner();

    if (stage.kind === "menu") {
      e.joinCode.value = "";
      return;
    }
    if (stage.kind !== "waiting") return;

    e.waitingNote.textContent = describeWaiting(stage.seeking, stage.code);
    const showCode = stage.code !== undefined;
    e.waitingCode.hidden = !showCode;
    // Le presse-papiers n'existe pas hors contexte sécurisé : proposer le bouton
    // sans lui ferait cliquer dans le vide.
    e.copy.hidden = !showCode || navigator.clipboard === undefined;
    e.copy.textContent = messages().game.waiting.copy;
    if (stage.code !== undefined) e.waitingCode.textContent = stage.code;
  };

  const setIdentity = (identity: Identity): void => {
    // La file exige une adresse vérifiée : proposer les entrées avant ferait
    // cliquer sur un refus.
    playable = identity.signedIn && identity.emailVerified !== false;
    e.identity.textContent = describeIdentity(identity);
    for (const button of [e.quick, e.host, e.join]) button.disabled = !playable;
    e.teamsEntry.disabled = !identity.signedIn;
    e.joinCode.disabled = !playable;
    e.admin.hidden = identity.admin !== true;
    signedIn = identity.signedIn;
    e.cornerName.textContent = identity.handle ?? "";
    showCorner();
    e.resend.hidden = !identity.signedIn || identity.emailVerified !== false;
    e.impersonation.hidden = identity.impersonating !== true;
    e.impersonated.textContent = identity.handle ?? "";
  };

  return {
    render,
    setIdentity,
    notify: (message) => {
      e.notice.textContent = message;
    },
    notifyWaiting: (message) => {
      e.waitingNote.textContent = message;
    },
  };
}
