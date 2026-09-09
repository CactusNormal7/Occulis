import type { Action, ActionError, Coord, Outcome, Result } from "@occulis/core";
import type { OnlineMatch } from "../game/online-match.js";
import { parseCommand, toAction } from "./command.js";
import {
  describeActionError,
  describeFault,
  describeMove,
  describeOutcome,
  describeTile,
  describeTurn,
} from "./messages.js";

/**
 * Saisie de coups au clavier et comptes rendus de partie : le bandeau affiché
 * pendant une partie, et rien d'autre — le compte et le menu ont leurs écrans
 * (`shell.ts`).
 *
 * La grammaire est dans `command.ts`, les textes dans `messages.ts` : il ne reste
 * ici que le branchement des événements et l'écriture dans la page.
 *
 * L'application d'une action lui est **fournie** (`play`) plutôt que prise sur la
 * partie : c'est l'appelant qui décide ce qu'un coup déclenche — animation,
 * passage de main — et ce module n'en sait rien.
 */

export interface ConsoleElements {
  readonly form: HTMLFormElement;
  readonly input: HTMLInputElement;
  readonly log: HTMLElement;
  readonly status: HTMLElement;
  /** Lecture de la case désignée au clic. */
  readonly readout: HTMLElement;
}

export interface ConsoleOptions {
  readonly elements: ConsoleElements;
  /**
   * Fournie par accès et non par valeur : la console est branchée une fois pour
   * toutes, alors que la partie change d'objet à chaque appariement — et n'existe
   * pas du tout tant que le joueur est au menu.
   */
  readonly match: () => OnlineMatch | undefined;
  /**
   * Envoie le coup au serveur. Elle **ne déplace rien** : le plateau ne bouge qu'à
   * l'arrivée de la vue suivante, et cette console ne fait qu'en rendre compte.
   */
  readonly play: (action: Action) => Result<Action, ActionError>;
  /** Vrai tant qu'un coup envoyé attend la réponse du serveur. */
  readonly pending: () => boolean;
}

export interface GameConsole {
  /** Réaffiche la ligne d'état, par exemple après un changement de point de vue. */
  refresh(): void;
  /** Écrit un compte rendu, pour ce qui arrive hors saisie — un refus du serveur. */
  report(message: string, accepted: boolean): void;
  /** Affiche la case désignée au clic, ou signale un clic hors plateau. */
  showTile(coord: Coord | undefined): void;
  /** Envoie une action venue d'ailleurs — un clic sur le plateau — et la rapporte. */
  playAction(action: Action): boolean;
  /**
   * Annonce la fin de partie. Elle vient de la vue du serveur, plus d'un coup joué :
   * le client n'applique rien, il ne saurait donc plus la constater lui-même.
   */
  announce(outcome: Outcome): void;
}

export function attachConsole(options: ConsoleOptions): GameConsole {
  const { elements, match, play, pending } = options;
  const { form, input, log, status, readout } = elements;

  const refresh = (): void => {
    const current = match();
    if (current === undefined) {
      status.textContent = "";
      return;
    }
    status.textContent = describeTurn(current.state.turn, current.activePlayer, current.player);
  };

  const showTile = (coord: Coord | undefined): void => {
    const board = match()?.board;
    readout.textContent = describeTile(
      coord === undefined || board === undefined ? undefined : board.getTile(coord),
    );
  };

  const report = (message: string, accepted: boolean): void => {
    log.textContent = message;
    log.dataset["state"] = accepted ? "ok" : "ko";
  };

  const playAction = (action: Action): boolean => {
    const current = match();
    if (current === undefined) return false;

    // Le résumé est composé avant de jouer : dans l'état suivant, la pièce
    // déplacée n'est plus à sa place de départ.
    const moved = action.kind === "move" ? current.state.pieces.get(action.pieceId) : undefined;

    // Un seul coup en vol à la fois : deux clics rapides enverraient deux coups
    // pour le même tour, dont le second serait refusé sans que rien ne l'explique.
    if (pending()) {
      report("Coup déjà envoyé : réponse du serveur en attente.", false);
      return false;
    }

    const played = play(action);
    if (!played.ok) {
      report(describeActionError(played.error), false);
      return false;
    }

    const summary =
      action.kind === "move" && moved !== undefined
        ? describeMove(moved, action.to)
        : "Abandon.";
    report(`${summary} — envoyé.`, true);
    refresh();
    return true;
  };

  const submit = (raw: string): void => {
    const command = parseCommand(raw);
    if (!command.ok) {
      report(describeFault(command.error), false);
      return;
    }

    const action = toAction(command.value, (coord) => match()?.pieceAt(coord));
    if (!action.ok) {
      report(describeFault(action.error), false);
      return;
    }

    if (playAction(action.value)) input.value = "";
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submit(input.value);
  });

  const announce = (outcome: Outcome): void => {
    report(describeOutcome(outcome), true);
  };

  refresh();
  return { refresh, report, announce, showTile, playAction };
}
