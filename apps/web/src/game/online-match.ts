import {
  type Action,
  type ActionError,
  type Board,
  type Coord,
  type GameState,
  type Piece,
  type PlayerId,
  type PlayerView,
  type Result,
  type Ruleset,
  applyAction,
  pieceAt,
} from "@occulis/core";
import { hypothesisFrom } from "./hypothesis.js";

/**
 * Une partie arbitrée par le serveur, vue du client. C'est la **seule** forme de
 * partie du client : il n'existe pas de partie locale, le serveur arbitre toujours
 * (docs/design.md section 2, « pas de local multiplayer »).
 *
 * Le client ne détient pas la position : il ne connaît que les `PlayerView` reçues,
 * et n'en reconstruit qu'une hypothèse (`hypothesis.ts`). Jouer consiste donc à
 * **envoyer** l'action et à appliquer localement un résultat provisoire, le temps
 * que la vue suivante arrive — sans quoi le plateau resterait figé pendant l'aller-
 * retour réseau.
 *
 * Cette anticipation peut se tromper : le serveur voit des pièces que le client
 * ignore, et sous « échecs strict » une menace invisible rend un coup illégal. La
 * vue suivante fait alors autorité et efface l'anticipation, et `receive()` est le
 * seul chemin par lequel l'état officiel entre.
 */
export class OnlineMatch {
  private view: PlayerView;
  private hypothesis: GameState;

  constructor(
    readonly board: Board,
    private readonly ruleset: Ruleset,
    private readonly seat: PlayerId,
    private readonly submit: (action: Action) => void,
    view: PlayerView,
  ) {
    this.view = view;
    this.hypothesis = hypothesisFrom(view, board, ruleset);
  }

  get state(): GameState {
    return this.hypothesis;
  }

  get activePlayer(): PlayerId {
    return this.hypothesis.activePlayer;
  }

  get isOver(): boolean {
    return this.hypothesis.outcome !== null;
  }

  /** Le camp du joueur, fixé par son jeton de siège et annoncé par le serveur. */
  get player(): PlayerId {
    return this.seat;
  }

  pieceAt(coord: Coord): Piece | undefined {
    return pieceAt(this.hypothesis, coord);
  }

  /**
   * Une seule vue existe côté client, celle de son siège : le serveur n'envoie pas
   * celle de l'adversaire, c'est tout l'objet du fog of war. Regarder le plateau
   * avec les yeux d'en face n'a donc pas de sens en ligne.
   */
  viewFor(_player: PlayerId): PlayerView {
    return this.view;
  }

  play(action: Action): Result<GameState, ActionError> {
    const anticipated = applyAction(this.hypothesis, action);
    if (!anticipated.ok) return anticipated;

    this.submit(action);
    this.hypothesis = anticipated.value;
    return anticipated;
  }

  /** La vue reçue du serveur fait autorité et remplace toute anticipation. */
  receive(view: PlayerView): void {
    this.view = view;
    this.hypothesis = hypothesisFrom(view, this.board, this.ruleset);
  }
}
