import type { PlayerId } from "@occulis/core";
import type { Match } from "../match.js";
import { parseCommand, toAction } from "./command.js";
import {
  describeActionError,
  describeFault,
  describeMove,
  describeOutcome,
  describeTurn,
} from "./messages.js";

/**
 * Saisie de coups au clavier : le joueur entre des coordonnées, le coup est joué.
 *
 * Seul module de l'interface à toucher le DOM. La grammaire est dans `command.ts`,
 * les textes dans `messages.ts` : il ne reste ici que le branchement des
 * événements et l'écriture dans la page.
 */

export interface ConsoleElements {
  readonly form: HTMLFormElement;
  readonly input: HTMLInputElement;
  readonly log: HTMLElement;
  readonly status: HTMLElement;
}

export interface ConsoleOptions {
  readonly elements: ConsoleElements;
  readonly match: Match;
  /** Point de vue affiché, que la console rappelle dans la ligne d'état. */
  readonly viewer: () => PlayerId;
  /** Appelé après un coup accepté, pour que la vue rendue suive la partie. */
  readonly onPlayed: () => void;
}

export interface GameConsole {
  /** Réaffiche la ligne d'état, par exemple après un changement de point de vue. */
  refresh(): void;
}

export function attachConsole(options: ConsoleOptions): GameConsole {
  const { elements, match, viewer, onPlayed } = options;
  const { form, input, log, status } = elements;

  const refresh = (): void => {
    status.textContent = describeTurn(match.state.turn, match.activePlayer, viewer());
  };

  const report = (message: string, accepted: boolean): void => {
    log.textContent = message;
    log.dataset["state"] = accepted ? "ok" : "ko";
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

    // Lus avant de jouer : la pièce déplacée et la capturée ne sont plus à leur
    // place — ni même présentes — dans l'état suivant.
    const moved = command.value.kind === "move" ? match.pieceAt(command.value.from) : undefined;
    const captured =
      command.value.kind === "move" && command.value.capture !== undefined
        ? match.pieceAt(command.value.capture)
        : undefined;

    const played = match.play(action.value);
    if (!played.ok) {
      report(describeActionError(played.error), false);
      return;
    }

    input.value = "";
    const outcome = played.value.outcome;
    const summary =
      command.value.kind === "resign" || moved === undefined
        ? "Abandon."
        : describeMove(moved, command.value.to, captured);
    report(outcome === null ? summary : `${summary} ${describeOutcome(outcome)}`, true);

    onPlayed();
    refresh();
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submit(input.value);
  });

  refresh();
  return { refresh };
}
