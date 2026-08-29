import type { Action, ActionError, Coord, GameState, PlayerId, Result } from "@occulis/core";
import type { Match } from "../game/match.js";
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
 * Saisie de coups au clavier et comptes rendus de partie.
 *
 * Seul module de l'interface à toucher le DOM. La grammaire est dans `command.ts`,
 * les textes dans `messages.ts` : il ne reste ici que le branchement des
 * événements et l'écriture dans la page.
 *
 * L'application d'une action lui est **fournie** (`play`) plutôt que prise sur
 * `Match` : c'est l'appelant qui décide ce qu'un coup déclenche — animation,
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
  readonly match: Match;
  /** Point de vue affiché, que la console rappelle dans la ligne d'état. */
  readonly viewer: () => PlayerId;
  readonly play: (action: Action) => Result<GameState, ActionError>;
}

export interface GameConsole {
  /** Réaffiche la ligne d'état, par exemple après un changement de point de vue. */
  refresh(): void;
  /** Affiche la case désignée au clic, ou signale un clic hors plateau. */
  showTile(coord: Coord | undefined): void;
  /** Joue une action venue d'ailleurs — un clic sur le plateau — et la rapporte. */
  playAction(action: Action): boolean;
}

export function attachConsole(options: ConsoleOptions): GameConsole {
  const { elements, match, viewer, play } = options;
  const { form, input, log, status, readout } = elements;

  const refresh = (): void => {
    status.textContent = describeTurn(match.state.turn, match.activePlayer, viewer());
  };

  const showTile = (coord: Coord | undefined): void => {
    readout.textContent = describeTile(
      coord === undefined ? undefined : match.board.getTile(coord),
    );
  };

  const report = (message: string, accepted: boolean): void => {
    log.textContent = message;
    log.dataset["state"] = accepted ? "ok" : "ko";
  };

  const playAction = (action: Action): boolean => {
    // Le résumé est composé avant de jouer : dans l'état suivant, la pièce
    // déplacée n'est plus à sa place et la capturée n'existe plus.
    const moved = action.kind === "move" ? match.state.pieces.get(action.pieceId) : undefined;
    const captured =
      action.kind === "move" && action.capture !== undefined
        ? match.state.pieces.get(action.capture)
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

    const action = toAction(command.value, (coord) => match.pieceAt(coord));
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
  return { refresh, showTile, playAction };
}
