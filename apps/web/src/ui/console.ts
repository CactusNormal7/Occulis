import type { Action, ActionError, Coord, GameState, Result } from "@occulis/core";
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
  readonly play: (action: Action) => Result<GameState, ActionError>;
}

export interface GameConsole {
  /** Réaffiche la ligne d'état, par exemple après un changement de point de vue. */
  refresh(): void;
  /** Écrit un compte rendu, pour ce qui arrive hors saisie — un refus du serveur. */
  report(message: string, accepted: boolean): void;
  /** Affiche la case désignée au clic, ou signale un clic hors plateau. */
  showTile(coord: Coord | undefined): void;
  /** Joue une action venue d'ailleurs — un clic sur le plateau — et la rapporte. */
  playAction(action: Action): boolean;
}

export function attachConsole(options: ConsoleOptions): GameConsole {
  const { elements, match, play } = options;
  const { form, input, log, status, readout } = elements;

  const refresh = (): void => {
    const current = match();
    if (current === undefined) {
      status.textContent = "";
      return;
    }
    status.textContent = describeTurn(
      current.state.turn,
      current.activePlayer,
      current.player,
      current.viewFor(current.player).check,
    );
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
    // déplacée n'est plus à sa place et la capturée n'existe plus.
    const moved = action.kind === "move" ? current.state.pieces.get(action.pieceId) : undefined;
    const captured =
      action.kind === "move" && action.capture !== undefined
        ? current.state.pieces.get(action.capture)
        : undefined;

    const played = play(action);
    if (!played.ok) {
      report(describeActionError(played.error), false);
      return false;
    }

    const summary =
      action.kind === "move" && moved !== undefined
        ? describeMove(moved, action.to, captured)
        : "Abandon.";
    const outcome = played.value.outcome;
    report(outcome === null ? summary : `${summary} ${describeOutcome(outcome)}`, true);
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

  refresh();
  return { refresh, report, showTile, playAction };
}
