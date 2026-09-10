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
  pieceAt,
  validateAction,
} from "@occulis/core";
import { hypothesisFrom } from "./hypothesis.js";
import { type Movement, movementBetween } from "./movement-diff.js";

/**
 * Une partie arbitrée par le serveur, vue du client. C'est la **seule** forme de
 * partie du client : il n'existe pas de partie locale, le serveur arbitre toujours
 * (docs/design.md section 2, « pas de local multiplayer »).
 *
 * Le client ne détient pas la position : il ne connaît que les `PlayerView` reçues,
 * et n'en reconstruit qu'une hypothèse (`hypothesis.ts`) pour la géométrie — dessiner
 * le plateau, désigner une case.
 *
 * **Jouer n'écrit rien.** `play()` envoie l'action et s'arrête là ; seule la vue
 * suivante déplace une pièce. `receive()` est donc le seul chemin par lequel l'état
 * entre, ce qui rend toute divergence impossible par construction.
 *
 * Le client anticipait autrefois le coup pour ne pas figer le plateau pendant
 * l'aller-retour réseau. Il en résultait un plateau bloqué à chaque refus : le coup
 * était appliqué et le trait passé, le serveur refusait sans rediffuser de vue, et
 * plus rien n'était jouable. Un aller-retour est sans conséquence dans un jeu au tour
 * par tour sans limite de temps de réflexion (docs/design.md section 2) ; une
 * désynchronisation, elle, casse la partie.
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

  /**
   * Les coups que le serveur accepte, tels qu'il les a calculés sur la position
   * réelle. C'est ce que l'interface doit proposer — le client ne saurait pas les
   * recalculer, il ne voit qu'un camp.
   */
  get legalActions(): readonly Action[] {
    return this.view.legalActions;
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

  /**
   * Envoie le coup. **N'écrit rien** : le plateau ne bouge qu'à l'arrivée de la vue.
   *
   * La validation locale ne sert qu'à répondre tout de suite, et précisément, sur ce
   * que le client peut juger seul — pièce inconnue, hors de portée, pas au trait. Elle
   * ne décide de rien : le serveur reste seul juge.
   */
  play(action: Action): Result<Action, ActionError> {
    const validated = validateAction(this.hypothesis, action);
    if (!validated.ok) return validated;

    this.submit(action);
    return validated;
  }

  /**
   * La vue reçue du serveur fait autorité. Rend le déplacement qu'elle décrit, pour
   * que l'appelant puisse l'animer — c'est le seul moment où une pièce bouge.
   */
  receive(view: PlayerView): Movement | undefined {
    const movement = movementBetween(this.view, view);
    this.view = view;
    this.hypothesis = hypothesisFrom(view, this.board, this.ruleset);
    return movement;
  }
}
