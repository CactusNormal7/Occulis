import type { Identity } from "../net/auth.js";
import { describeIdentity } from "./account.js";
import type { Seeking, Stage } from "./flow.js";
import { describeWaiting } from "./messages.js";

/**
 * Les écrans : compte, menu, attente, partie. Un seul est visible à la fois.
 *
 * Ce module montre ce que `flow.ts` a décidé — il ne décide rien lui-même, et
 * n'appelle jamais le réseau : il rend les gestes du joueur à la racine de
 * composition. C'est le pendant DOM de la machine à états, et le seul endroit qui
 * connaisse les identifiants de la page avec `main.ts`.
 *
 * Provisoire, comme tout l'habillage : aucun design system n'est acté
 * (docs/design.md 8.1).
 */
export interface ShellElements {
  readonly auth: HTMLElement;
  readonly menu: HTMLElement;
  readonly waiting: HTMLElement;
  /** Le canevas de jeu, montré seulement une fois la partie commencée. */
  readonly board: HTMLElement;
  readonly hud: HTMLElement;

  readonly identity: HTMLElement;
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
}

export interface Shell {
  render(stage: Stage): void;
  /** L'identité rendue par le serveur : elle ouvre ou ferme les entrées du menu. */
  setIdentity(identity: Identity): void;
  /** Un mot au joueur sur l'écran de menu — un code refusé, une partie terminée. */
  notify(message: string): void;
}

export function attachShell(options: ShellOptions): Shell {
  const e = options.elements;
  let playable = false;

  e.quick.addEventListener("click", () => options.onSeek("quick"));
  e.host.addEventListener("click", () => options.onSeek("host"));

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
      e.copy.textContent = "Copié";
    });
  });

  const render = (stage: Stage): void => {
    e.auth.hidden = stage.kind !== "auth";
    e.menu.hidden = stage.kind !== "menu";
    e.waiting.hidden = stage.kind !== "waiting";
    e.board.hidden = stage.kind !== "game";
    e.hud.hidden = stage.kind !== "game";

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
    e.copy.textContent = "Copier";
    if (stage.code !== undefined) e.waitingCode.textContent = stage.code;
  };

  const setIdentity = (identity: Identity): void => {
    // La file exige une adresse vérifiée : proposer les entrées avant ferait
    // cliquer sur un refus.
    playable = identity.signedIn && identity.emailVerified !== false;
    e.identity.textContent = describeIdentity(identity);
    for (const button of [e.quick, e.host, e.join]) button.disabled = !playable;
    e.joinCode.disabled = !playable;
  };

  return {
    render,
    setIdentity,
    notify: (message) => {
      e.notice.textContent = message;
    },
  };
}
